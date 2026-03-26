import { Worker } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import { sql, eq } from 'drizzle-orm';
import { db } from '@codeopt/db';
import { analyses, fixes, issues, users } from '@codeopt/db/schema';
import { Redis } from 'ioredis';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

const redisUrl = process.env.UPSTASH_REDIS_URL;
if (!redisUrl) {
  throw new Error('UPSTASH_REDIS_URL is required for worker startup.');
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

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

const REPORT_ISSUE_TOOL: Tool = {
  name: 'report_issue',
  description: 'Structured issue output',
  input_schema: {
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
};

function buildAnalysisPrompt(language: string, code: string) {
  return `Analyze this ${language} code and report issues via the report_issue tool only.\n\n${code}`;
}

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

      // This implementation path expects code to be available in metadata.inputCode for now.
      const code = (analysis.metadata as Record<string, unknown> | null)?.inputCode as string | undefined;
      if (!code) {
        throw new Error('No input code available for analysis worker');
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildAnalysisPrompt(analysis.language, code) }],
        tools: [REPORT_ISSUE_TOOL],
      });

      const reportedIssues = response.content
        .filter((b) => b.type === 'tool_use' && b.name === 'report_issue')
        .map((b) => (b as { input: ReportedIssue }).input);

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
            reportedIssues.map((issue) => ({
              analysisId,
              line: issue.line,
              col: issue.col ?? 0,
              severity: issue.severity,
              category: issue.category,
              rule: issue.rule,
              message: issue.message,
              suggestion: issue.suggestion,
              codeSnippet: issue.codeSnippet,
              fixable: issue.fixable ?? false,
            })),
          )
          .returning({ id: issues.id, message: issues.message });

        const fixable = reportedIssues.filter((i) => i.fixable);
        for (const fixableIssue of fixable) {
          const issueRow = insertedIssueRows.find((r) => r.message === fixableIssue.message);
          if (!issueRow) {
            continue;
          }

          const fixResp = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: `Generate a fix for ${analysis.language}. Issue: ${fixableIssue.message}\n\nCode:\n${fixableIssue.codeSnippet ?? ''}`,
              },
            ],
          });

          const text = fixResp.content.find((b) => b.type === 'text');
          const explanation = text?.type === 'text' ? text.text : '';
          const fixedCode = extractCodeBlock(explanation);

          if (fixedCode) {
            await db.insert(fixes).values({
              issueId: issueRow.id,
              originalCode: fixableIssue.codeSnippet,
              fixedCode,
              explanation,
              confidenceScore: 85,
            });
          }
        }
      }

      await db
        .update(analyses)
        .set({
          status: 'complete',
          score,
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
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
      await db
        .update(analyses)
        .set({ status: 'failed', errorMessage: String(err), updatedAt: new Date() })
        .where(eq(analyses.id, analysisId));
      throw err;
    }
  },
  { connection, concurrency: 5 },
);
