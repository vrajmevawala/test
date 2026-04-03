import { z } from 'zod';
import { and, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { analyses, issues, users, fixes } from '@codeopt/db/schema';
import { t } from '../init.js';
import { adminProcedure, developerProcedure, workspaceProcedure } from '../middleware.js';
import { enqueueAnalysis } from '../../jobs/analysis-queue.js';
import { insertAuditLog } from '../../lib/audit.js';

export const analysisRouter = t.router({
  create: developerProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(512),
        language: z.enum(['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp', 'ruby', 'php']),
        contentSize: z.number().min(1).max(500_000),
        sourceCode: z.string().min(1),
        id: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [userRow] = await ctx.db
        .select({ creditsUsed: users.creditsUsed, creditsLimit: users.creditsLimit })
        .from(users)
        .where(eq(users.id, ctx.user!.id))
        .limit(1);

      if (!userRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
      }

      const creditsRequired = Math.max(4, Math.ceil(input.contentSize / 10_000));
      
      let analysisId = input.id;

      if (analysisId) {
        // Update existing analysis
        await ctx.db
          .update(analyses)
          .set({
            filename: input.filename,
            language: input.language,
            status: 'pending',
            creditsCharged: creditsRequired,
            metadata: { sourceCode: input.sourceCode },
            updatedAt: new Date(),
          })
          .where(and(eq(analyses.id, analysisId), eq(analyses.createdById, ctx.user!.id)));
      } else {
        // Create new analysis
        const [newAnalysis] = await ctx.db
          .insert(analyses)
          .values({
            workspaceId: ctx.workspaceId!,
            createdById: ctx.user!.id,
            filename: input.filename,
            language: input.language,
            status: 'pending',
            creditsCharged: creditsRequired,
            metadata: { sourceCode: input.sourceCode },
          })
          .returning({ id: analyses.id });
        analysisId = newAnalysis.id;
      }

      await insertAuditLog(ctx, {
        action: input.id ? 'analysis.updated' : 'analysis.created',
        resourceType: 'analysis',
        resourceId: analysisId,
      });

      return { analysisId: analysisId!, creditsRequired };
    }),

  start: developerProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [analysis] = await ctx.db
        .select({ id: analyses.id, status: analyses.status, workspaceId: analyses.workspaceId })
        .from(analyses)
        .where(and(eq(analyses.id, input.analysisId), eq(analyses.workspaceId, ctx.workspaceId!)))
        .limit(1);

      if (!analysis) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Analysis not found.' });
      }

      if (analysis.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Analysis already started.' });
      }

      await ctx.db
        .update(analyses)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(analyses.id, input.analysisId));

      try {
        await enqueueAnalysis({
          analysisId: input.analysisId,
          workspaceId: ctx.workspaceId!,
        });
      } catch (err) {
        console.error("[Redis] Failed to enqueue analysis:", err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to queue analysis. Please ensure Redis is running.',
        });
      }

      await insertAuditLog(ctx, {
        action: 'analysis.started',
        resourceType: 'analysis',
        resourceId: input.analysisId,
      });

      return { queued: true, analysisId: input.analysisId };
    }),

  list: workspaceProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(['pending', 'processing', 'complete', 'failed', 'cancelled']).optional(),
        language: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const filters = [
        eq(analyses.workspaceId, ctx.workspaceId!),
        ...(input.status ? [eq(analyses.status, input.status)] : []),
        ...(input.language ? [eq(analyses.language, input.language as never)] : []),
        ...(input.search ? [ilike(analyses.filename, `%${input.search}%`)] : []),
      ];

      const [rows, [totalRow]] = await Promise.all([
        ctx.db
          .select({
            id: analyses.id,
            filename: analyses.filename,
            language: analyses.language,
            status: analyses.status,
            score: analyses.score,
            createdAt: analyses.createdAt,
            completedAt: analyses.completedAt,
            issueCount: sql<number>`(SELECT count(*) FROM issues WHERE analysis_id = ${analyses.id})`,
            fixedCount: sql<number>`(SELECT count(*) FROM issues WHERE analysis_id = ${analyses.id} AND fix_applied = true)`,
            createdByName: users.name,
          })
          .from(analyses)
          .leftJoin(users, eq(users.id, analyses.createdById))
          .where(and(...filters))
          .orderBy(desc(analyses.createdAt))
          .limit(input.pageSize)
          .offset(offset),

        ctx.db
          .select({ total: count(analyses.id) })
          .from(analyses)
          .where(and(...filters)),
      ]);

      const total = Number(totalRow.total);
      return {
        items: rows,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  byId: workspaceProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [analysis] = await ctx.db
        .select()
        .from(analyses)
        .where(and(eq(analyses.id, input.id), eq(analyses.workspaceId, ctx.workspaceId!)))
        .limit(1);

      if (!analysis) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Analysis not found.' });
      }

      const analysisIssues = await ctx.db
        .select({
          id: issues.id,
          line: issues.line,
          column: issues.col,
          severity: issues.severity,
          message: issues.message,
          rule: issues.rule,
          fixable: issues.fixable,
          fix: fixes.fixedCode,
        })
        .from(issues)
        .leftJoin(fixes, eq(fixes.issueId, issues.id))
        .where(eq(issues.analysisId, analysis.id))
        .orderBy(issues.severity, issues.line);

      return { ...analysis, issues: analysisIssues };
    }),

  status: workspaceProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          status: analyses.status,
          score: analyses.score,
          errorMessage: analyses.errorMessage,
          completedAt: analyses.completedAt,
        })
        .from(analyses)
        .where(and(eq(analyses.id, input.id), eq(analyses.workspaceId, ctx.workspaceId!)))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Analysis not found.' });
      }

      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(analyses)
        .where(and(eq(analyses.id, input.id), eq(analyses.workspaceId, ctx.workspaceId!)))
        .returning({ id: analyses.id });

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Analysis not found.' });
      }

      await insertAuditLog(ctx, {
        action: 'analysis.deleted',
        resourceType: 'analysis',
        resourceId: input.id,
      });

      return { deleted: true };
    }),
});
