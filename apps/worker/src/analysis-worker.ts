import { Worker } from 'bullmq';
import Groq from 'groq-sdk';
import { sql, eq } from 'drizzle-orm';
import { db } from '@codeopt/db';
import { analyses, fixes, issues, users } from '@codeopt/db/schema';
import { Redis } from 'ioredis';
import { 
  ANALYSIS_SYSTEM_PROMPT, 
  buildAnalysisUserPrompt, 
  buildFixPrompt,
  buildASTContext
} from './prompts.js';
import { getTreeSitterAnalysis, snapToNode } from './utils/tree-sitter-analyzer.js';

const redisUrl = process.env.UPSTASH_REDIS_URL;
if (!redisUrl) {
  throw new Error('UPSTASH_REDIS_URL is required for worker startup.');
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

type ReportedIssue = {
  line: number;
  col?: number;
  severity: 'error' | 'warning' | 'info';
  category: 'security' | 'performance' | 'complexity' | 'style' | 'best-practice' | 'bug';
  rule: string;
  message: string;
  suggestion?: string;
  codeSnippet?: string;
  fixable?: boolean;
};

const REPORT_ISSUE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'report_issue',
    description: 'Structured issue output for code analysis',
    parameters: {
      type: 'object',
      properties: {
        line: { type: 'number' },
        col: { type: 'number' },
        severity: { type: 'string', enum: ['error', 'warning', 'info'] },
        category: {
          type: 'string',
          enum: ['security', 'performance', 'complexity', 'style', 'best-practice', 'bug'],
        },
        rule: { type: 'string' },
        message: { type: 'string' },
        suggestion: { type: 'string' },
        codeSnippet: { type: 'string' },
        fixable: { type: 'boolean' },
      },
      required: ['line', 'severity', 'category', 'rule', 'message'],
    },
  },
};

// Removed buildAnalysisPrompt (moved to prompts.ts)

function extractCodeBlock(text: string): string | null {
  const match = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return match?.[1]?.trim() ?? null;
}

export const analysisWorker = new Worker(
  'analysis',
  async (job) => {
    const { analysisId } = job.data as { analysisId: string; workspaceId: string };

    try {
      const [analysis] = await db.select().from(analyses).where(eq(analyses.id, analysisId)).limit(1);
      if (!analysis?.codeStorageKey) {
        throw new Error('Analysis or codeStorageKey missing');
      }

      // In a real app, you would download the code from S3/R2 here.
      // For now, we assume it's passed or stored in metadata during creation.
      const code = (analysis.metadata as Record<string, unknown> | null)?.sourceCode as string | undefined;
      
      if (!code) {
        // Fallback: try to get it from where the frontend uploaded it if we had proper R2 access here.
        // For this demo, let's assume sourceCode was added to metadata in analysis.create (which I should fix in the router).
        throw new Error('No source code available for analysis');
      }

      // PRE-ANALYSIS: Run Structural Tree-sitter Pass
      const astMetrics = analysis.language === 'python' ? getTreeSitterAnalysis(code, 'python') : null;
      const astContext = astMetrics ? buildASTContext(astMetrics) : undefined;
      
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: buildAnalysisUserPrompt(analysis.language, code, astContext) }
        ],
        tools: [REPORT_ISSUE_TOOL],
        tool_choice: 'auto',
      });

      const toolCalls = response.choices[0]?.message?.tool_calls || [];
      const reportedIssues: ReportedIssue[] = toolCalls
        .filter((tc) => tc.function.name === 'report_issue')
        .map((tc) => JSON.parse(tc.function.arguments));

      const score = Math.max(
        0,
        100 -
          reportedIssues.filter((i) => i.severity === 'error').length * 12 -
          reportedIssues.filter((i) => i.severity === 'warning').length * 5 -
          reportedIssues.filter((i) => i.severity === 'info').length,
      );

      let insertedIssueRows: Array<{ id: string; message: string }> = [];
      if (reportedIssues.length > 0) {
        insertedIssueRows = await db
          .insert(issues)
          .values(
            reportedIssues.map((issue) => {
              // Coordinate Snapping Pass
              const snapped = snapToNode(code, issue.line, issue.col ?? 0);
              
              return {
                analysisId,
                line: snapped?.line ?? issue.line,
                col: snapped?.col ?? issue.col ?? 0,
                endLine: snapped?.endLine ?? snapped?.line ?? issue.line,
                severity: issue.severity,
                category: issue.category,
                rule: issue.rule,
                message: issue.message,
                suggestion: issue.suggestion,
                codeSnippet: issue.codeSnippet || code.split('\n')[(snapped?.line ?? issue.line) - 1] || '',
                fixable: issue.fixable ?? false,
              };
            }),
          )
          .returning({ id: issues.id, message: issues.message });

        const fixable = reportedIssues.filter((i) => i.fixable);
        for (const fixableIssue of fixable) {
          const issueRow = insertedIssueRows.find((r) => r.message === fixableIssue.message);
          if (!issueRow) continue;

          const fixResp = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'user',
                content: buildFixPrompt(analysis.language, fixableIssue.message, fixableIssue.codeSnippet ?? code.split('\n')[fixableIssue.line - 1]),
              },
            ],
          });

          const explanation = fixResp.choices[0]?.message?.content || '';
          const fixedCode = extractCodeBlock(explanation) || explanation;

          if (fixedCode) {
            await db.insert(fixes).values({
              issueId: issueRow.id,
              originalCode: fixableIssue.codeSnippet || code.split('\n')[fixableIssue.line - 1],
              fixedCode,
              explanation: "AI generated fix.",
              confidenceScore: 90,
            });
          }
        }
      }

      await db
        .update(analyses)
        .set({
          status: 'complete',
          score,
          cyclomaticComplexity: astMetrics?.cyclomaticComplexity || null,
          cognitiveComplexity: astMetrics?.cognitiveComplexity || null,
          tokensUsed: response.usage?.total_tokens || 0,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(analyses.id, analysisId));

      await db
        .update(users)
        .set({
          creditsUsed: sql`${users.creditsUsed} + ${analysis.creditsCharged ?? 0}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, analysis.createdById));
        
    } catch (err) {
      console.error("[Groq] Analysis failed:", err);
      await db
        .update(analyses)
        .set({ status: 'failed', errorMessage: String(err), updatedAt: new Date() })
        .where(eq(analyses.id, analysisId));
      throw err;
    }
  },
  { connection, concurrency: 5 },
);
