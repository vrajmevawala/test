import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { analyses, issues, fixes, auditLogs } from '@codeopt/db/schema';
import { and, avg, count, desc, eq } from 'drizzle-orm';
import type { DB } from '@codeopt/db';

export const BOT_TOOLS: Tool[] = [
  {
    name: 'get_analysis',
    description: 'Get details of a specific code analysis',
    input_schema: {
      type: 'object',
      properties: {
        analysisId: { type: 'string' }
      },
      required: ['analysisId']
    }
  },
  {
    name: 'get_issues',
    description: 'List issues for an analysis. Can filter by severity or category.',
    input_schema: {
      type: 'object',
      properties: {
        analysisId: { type: 'string' },
        severity: { type: 'string', enum: ['error', 'warning', 'info'] },
        category: { type: 'string' },
        fixableOnly: { type: 'boolean' }
      },
      required: ['analysisId']
    }
  },
  {
    name: 'get_workspace_stats',
    description: 'Get aggregate stats for a workspace and period.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number' }
      }
    }
  },
  {
    name: 'get_recent_analyses',
    description: 'Get most recent analyses for a workspace.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'apply_fix',
    description: 'Apply fix for a specific issue when user explicitly confirms.',
    input_schema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' }
      },
      required: ['issueId']
    }
  }
];

type ToolContext = {
  userId: string;
  workspaceId: string;
  db: DB;
};

export async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolContext) {
  const { db, userId, workspaceId } = ctx;

  switch (name) {
    case 'get_analysis': {
      const [row] = await db
        .select()
        .from(analyses)
        .where(and(eq(analyses.id, input.analysisId as string), eq(analyses.workspaceId, workspaceId)))
        .limit(1);

      return row ?? { error: 'Analysis not found' };
    }

    case 'get_issues': {
      return db
        .select()
        .from(issues)
        .innerJoin(analyses, eq(analyses.id, issues.analysisId))
        .where(
          and(
            eq(issues.analysisId, input.analysisId as string),
            eq(analyses.workspaceId, workspaceId),
            ...(input.severity ? [eq(issues.severity, input.severity as never)] : []),
            ...(input.category ? [eq(issues.category, input.category as never)] : []),
            ...(input.fixableOnly ? [eq(issues.fixable, true)] : [])
          )
        )
        .orderBy(issues.severity, issues.line)
        .limit(50);
    }

    case 'get_workspace_stats': {
      const days = Math.max(1, Number(input.days ?? 30));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [stats] = await db
        .select({
          totalAnalyses: count(analyses.id),
          avgScore: avg(analyses.score),
        })
        .from(analyses)
        .where(and(eq(analyses.workspaceId, workspaceId), eq(analyses.status, 'complete')));

      return {
        totalAnalyses: Number(stats.totalAnalyses),
        avgScore: Math.round(Number(stats.avgScore ?? 0)),
        period: `${days} days`,
        since,
      };
    }

    case 'get_recent_analyses': {
      const limit = Math.min(Math.max(Number(input.limit ?? 5), 1), 20);
      return db
        .select({
          id: analyses.id,
          filename: analyses.filename,
          score: analyses.score,
          status: analyses.status,
          createdAt: analyses.createdAt,
        })
        .from(analyses)
        .where(eq(analyses.workspaceId, workspaceId))
        .orderBy(desc(analyses.createdAt))
        .limit(limit);
    }

    case 'apply_fix': {
      const [issue] = await db
        .select({ id: issues.id, fixApplied: issues.fixApplied })
        .from(issues)
        .innerJoin(analyses, eq(analyses.id, issues.analysisId))
        .where(and(eq(issues.id, input.issueId as string), eq(analyses.workspaceId, workspaceId)))
        .limit(1);

      if (!issue) {
        return { error: 'Issue not found' };
      }

      if (issue.fixApplied) {
        return { error: 'Fix already applied' };
      }

      await db
        .update(issues)
        .set({ fixApplied: true, fixAppliedAt: new Date(), fixAppliedBy: userId })
        .where(eq(issues.id, input.issueId as string));

      await db
        .update(fixes)
        .set({ status: 'applied', appliedById: userId, appliedAt: new Date() })
        .where(eq(fixes.issueId, input.issueId as string));

      await db.insert(auditLogs).values({
        actorId: userId,
        workspaceId,
        action: 'fix.applied',
        resourceType: 'issue',
        resourceId: input.issueId as string,
      });

      return { success: true, issueId: input.issueId };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
