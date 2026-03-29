import { z } from 'zod';
import { and, avg, count, desc, eq, gte, sql, sum } from 'drizzle-orm';
import { analyses, issues, users, auditLogs } from '@codeopt/db/schema';
import { t } from '../init.js';
import { workspaceProcedure } from '../middleware.js';

export const dashboardRouter = t.router({
  stats: workspaceProcedure
    .input(
      z.object({
        since: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = input.since
        ? new Date(input.since)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [statsRow] = await ctx.db
        .select({
          totalAnalyses: count(analyses.id),
          avgScore: avg(analyses.score),
        })
        .from(analyses)
        .where(
          and(
            eq(analyses.workspaceId, ctx.workspaceId!),
            eq(analyses.status, 'complete'),
            gte(analyses.createdAt, since),
          ),
        );

      const [issueRow] = await ctx.db
        .select({
          totalIssues: count(issues.id),
          totalFixed: sum(sql<number>`CASE WHEN ${issues.fixApplied} = true THEN 1 ELSE 0 END`),
        })
        .from(issues)
        .innerJoin(analyses, eq(issues.analysisId, analyses.id))
        .where(and(eq(analyses.workspaceId, ctx.workspaceId!), gte(analyses.createdAt, since)));

      return {
        totalAnalyses: Number(statsRow.totalAnalyses),
        avgScore: Math.round(Number(statsRow.avgScore ?? 0)),
        totalIssues: Number(issueRow.totalIssues),
        totalFixed: Number(issueRow.totalFixed ?? 0),
      };
    }),

  weeklyChart: workspaceProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        day: sql<string>`DATE(${analyses.createdAt})`.as('day'),
        count: count(analyses.id),
      })
      .from(analyses)
      .where(
        and(
          eq(analyses.workspaceId, ctx.workspaceId!),
          gte(analyses.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        ),
      )
      .groupBy(sql`DATE(${analyses.createdAt})`)
      .orderBy(sql`DATE(${analyses.createdAt})`);

    const map = new Map(rows.map((r) => [r.day, Number(r.count)]));
    const result: Array<{ date: string; count: number }> = [];

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: map.get(key) ?? 0 });
    }

    return result;
  }),

  issueBreakdown: workspaceProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ category: issues.category, count: count(issues.id) })
      .from(issues)
      .innerJoin(analyses, eq(issues.analysisId, analyses.id))
      .where(eq(analyses.workspaceId, ctx.workspaceId!))
      .groupBy(issues.category)
      .orderBy(desc(count(issues.id)));

    const total = rows.reduce((acc, r) => acc + Number(r.count), 0);
    return rows.map((r) => ({
      category: r.category,
      count: Number(r.count),
      pct: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
    }));
  }),

  recentActivity: workspaceProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          createdAt: auditLogs.createdAt,
          actorName: users.name,
          actorAvatar: users.avatarUrl,
          filename: analyses.filename,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .leftJoin(analyses, eq(auditLogs.resourceId, analyses.id))
        .where(eq(auditLogs.workspaceId, ctx.workspaceId!))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);
    }),

  qualityScore: workspaceProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ avgScore: avg(analyses.score) })
      .from(analyses)
      .where(
        and(
          eq(analyses.workspaceId, ctx.workspaceId!),
          eq(analyses.status, 'complete'),
          gte(analyses.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        ),
      );

    const categoryRows = await ctx.db
      .select({
        category: issues.category,
        total: count(issues.id),
        fixed: sum(sql<number>`CASE WHEN ${issues.fixApplied} THEN 1 ELSE 0 END`),
      })
      .from(issues)
      .innerJoin(analyses, eq(issues.analysisId, analyses.id))
      .where(
        and(
          eq(analyses.workspaceId, ctx.workspaceId!),
          gte(analyses.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        ),
      )
      .groupBy(issues.category);

    return {
      overall: Math.round(Number(row?.avgScore ?? 0)),
      categories: categoryRows.map((r) => {
        const total = Number(r.total);
        const fixed = Number(r.fixed ?? 0);
        return {
          category: r.category,
          score: total > 0 ? Math.round((fixed / total) * 100) : 100,
        };
      }),
    };
  }),
});
