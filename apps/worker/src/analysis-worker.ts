import { Worker } from 'bullmq';
import Groq from 'groq-sdk';
import { sql, eq } from 'drizzle-orm';
import { db } from '@codeopt/db';
import { analyses, fixes, issues, users } from '@codeopt/db/schema';
import { Redis } from 'ioredis';
import { 
  buildAnalysisSystemPrompt, 
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
  category: 'security' | 'performance' | 'complexity' | 'style' | 'best-practice' | 'bug' | 'memory';
  rule: string;
  dimension?: string;
  message: string;
  suggestion?: string;
  codeSnippet?: string;
  fixable?: boolean;
  metricsImpact?: {
    timeComplexity?: string;
    spaceComplexity?: string;
  };
};

const COMPLETE_ANALYSIS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'complete_analysis',
    description: 'Report ALL analysis findings across all 12 dimensions, including issues and overall code metrics. Every issue MUST include metricsImpact.',
    parameters: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              line: { type: 'number', description: 'Exact line number of the issue' },
              col: { type: 'number', description: 'Column number (0 if unknown)' },
              severity: { type: 'string', enum: ['error', 'warning', 'info'] },
              category: {
                type: 'string',
                enum: ['security', 'performance', 'complexity', 'style', 'best-practice', 'bug', 'memory'],
              },
              rule: { type: 'string', description: 'Machine-readable rule ID (e.g., "pass-by-value-large-struct", "quadratic-loop")' },
              message: { type: 'string', description: 'Human-readable explanation of the issue' },
              suggestion: { type: 'string', description: 'Recommended fix with concrete code example' },
              codeSnippet: { type: 'string', description: 'The offending code from the source' },
              fixable: { type: 'boolean', description: 'Whether this issue can be auto-fixed' },
              dimension: { type: 'string', description: 'Which analysis dimension (D1–D12) this belongs to' },
              metricsImpact: {
                type: 'object',
                description: 'MANDATORY: BEFORE → AFTER complexity comparison for BOTH time and space',
                properties: {
                  timeComplexity: { type: 'string', description: 'e.g., "O(n²) → O(n log n)" or "unchanged"' },
                  spaceComplexity: { type: 'string', description: 'e.g., "O(n) → O(1)" or "unchanged"' },
                },
                required: ['timeComplexity', 'spaceComplexity'],
              },
            },
            required: ['line', 'severity', 'category', 'rule', 'message', 'metricsImpact'],
          }
        },
        overallTimeComplexity: { type: 'string', description: 'Worst-case Big-O time complexity of the dominant path (e.g., O(n²))' },
        overallSpaceComplexity: { type: 'string', description: 'Auxiliary space complexity excluding input (e.g., O(n))' },
        overallComplexityScore: { type: 'number', description: 'Score from 0–100 indicating how close to optimal the code is (100 = optimal)' },
        theoreticalOptimal: { type: 'string', description: 'The best possible complexity for this problem class (e.g., O(n log n) for comparison sort)' },
      },
      required: ['issues', 'overallTimeComplexity', 'overallSpaceComplexity', 'overallComplexityScore', 'theoreticalOptimal'],
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
      const code = (analysis.metadata as Record<string, unknown> | null)?.sourceCode as string | undefined;
      
      if (!code) {
        throw new Error('No source code available for analysis');
      }

      await db.delete(issues).where(eq(issues.analysisId, analysisId));

      const astMetrics = ['python', 'cpp', 'c++'].includes(analysis.language.toLowerCase()) 
        ? await getTreeSitterAnalysis(code, analysis.language) 
        : null;
      const astContext = astMetrics ? buildASTContext(astMetrics) : undefined;
      
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: buildAnalysisSystemPrompt(analysis.language) },
          { role: 'user', content: buildAnalysisUserPrompt(analysis.language, code, astContext) }
        ],
        tools: [COMPLETE_ANALYSIS_TOOL],
        tool_choice: { type: 'function', function: { name: 'complete_analysis' } },
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== 'complete_analysis') {
        throw new Error('LLM failed to provide a valid complete_analysis tool call.');
      }

      const args = JSON.parse(toolCall.function.arguments);
      const reportedIssues: ReportedIssue[] = args.issues || [];
      const overallComplexity = {
        timeComplexity: args.overallTimeComplexity,
        spaceComplexity: args.overallSpaceComplexity,
        complexityScore: args.overallComplexityScore,
        theoreticalOptimal: args.theoreticalOptimal,
      };

      const lineCount = code.split('\n').length;
      const densityFactor = Math.max(1, lineCount / 100);
      const rawDeductions = (
        reportedIssues.filter((i) => i.severity === 'error').length * 12 +
        reportedIssues.filter((i) => i.severity === 'warning').length * 5 +
        reportedIssues.filter((i) => i.severity === 'info').length
      );

      const score = Math.max(0, Math.round(100 - (rawDeductions / densityFactor)));

      let insertedIssueRows: Array<{ id: string; message: string }> = [];
      if (reportedIssues.length > 0) {
        const issueValues = await Promise.all(reportedIssues.map(async (issue) => {
          // Coordinate Snapping Pass (Optional)
          const snapped = await snapToNode(code, issue.line, issue.col ?? 0);
          
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
            dimension: issue.dimension || null,
            codeSnippet: issue.codeSnippet || code.split('\n')[(snapped?.line ?? issue.line) - 1] || '',
            fixable: issue.fixable ?? false,
            metadata: (issue.metricsImpact?.timeComplexity || issue.metricsImpact?.spaceComplexity) 
              ? { timeComplexity: issue.metricsImpact.timeComplexity, spaceComplexity: issue.metricsImpact.spaceComplexity } 
              : null,
          };
        }));

        insertedIssueRows = await db
          .insert(issues)
          .values(issueValues)
          .returning({ id: issues.id, message: issues.message });

        const fixable = reportedIssues.filter((i) => i.fixable);
        const fixPromises = fixable.map(async (fixableIssue) => {
          const issueRow = insertedIssueRows.find((r) => r.message === fixableIssue.message);
          if (!issueRow) return;

          const fixResp = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'user',
                content: buildFixPrompt(
                  analysis.language,
                  fixableIssue.message,
                  fixableIssue.codeSnippet ?? code.split('\n')[fixableIssue.line - 1],
                ),
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
              explanation: 'AI generated fix.',
              confidenceScore: 90,
            });
          }
        });

        await Promise.all(fixPromises);
      }

      await db
        .update(analyses)
        .set({
          status: 'complete',
          score,
          linesOfCode: lineCount,
          cyclomaticComplexity: astMetrics?.cyclomaticComplexity || null,
          cognitiveComplexity: astMetrics?.cognitiveComplexity || null,
          metadata: { 
            ...((analysis.metadata as any) || {}), 
            timeComplexity: overallComplexity?.timeComplexity || null, 
            spaceComplexity: overallComplexity?.spaceComplexity || null,
            complexityScore: overallComplexity?.complexityScore || null,
            theoreticalOptimal: overallComplexity?.theoreticalOptimal || null,
          },
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
