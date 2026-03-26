import { z } from 'zod';
import { and, count, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { analyses, issues } from '@codeopt/db/schema';
import { t } from '../init.js';
import { workspaceProcedure } from '../middleware.js';

export const issueRouter = t.router({
  byAnalysis: workspaceProcedure
    .input(
      z.object({
        analysisId: z.string().uuid(),
        severity: z.enum(['error', 'warning', 'info']).optional(),
        category: z.string().optional(),
        fixableOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [analysis] = await ctx.db
        .select({ id: analyses.id })
        .from(analyses)
        .where(and(eq(analyses.id, input.analysisId), eq(analyses.workspaceId, ctx.workspaceId!)))
        .limit(1);

      if (!analysis) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Analysis not found.' });
      }

      return ctx.db
        .select()
        .from(issues)
        .where(
          and(
            eq(issues.analysisId, input.analysisId),
            ...(input.severity ? [eq(issues.severity, input.severity)] : []),
            ...(input.category ? [eq(issues.category, input.category as never)] : []),
            ...(input.fixableOnly ? [eq(issues.fixable, true)] : []),
          ),
        )
        .orderBy(issues.severity, issues.line);
    }),

  summary: workspaceProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({ severity: issues.severity, count: count(issues.id) })
        .from(issues)
        .innerJoin(analyses, eq(analyses.id, issues.analysisId))
        .where(and(eq(issues.analysisId, input.analysisId), eq(analyses.workspaceId, ctx.workspaceId!)))
        .groupBy(issues.severity);

      const [fixableRow] = await ctx.db
        .select({ count: count(issues.id) })
        .from(issues)
        .where(and(eq(issues.analysisId, input.analysisId), eq(issues.fixable, true)));

      return {
        bySeverity: rows.map((r) => ({ severity: r.severity, count: Number(r.count) })),
        fixable: Number(fixableRow?.count ?? 0),
      };
    }),
});
