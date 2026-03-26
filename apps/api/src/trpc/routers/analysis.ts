import { z } from 'zod';
import { and, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { analyses, issues, users } from '@codeopt/db/schema';
import { t } from '../init.js';
import { adminProcedure, developerProcedure, workspaceProcedure } from '../middleware.js';
import { generatePresignedUploadUrl } from '../../lib/r2.js';
import { enqueueAnalysis } from '../../jobs/analysis-queue.js';
import { insertAuditLog } from '../../lib/audit.js';

export const analysisRouter = t.router({
  create: developerProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(512),
        language: z.enum(['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp']),
        contentSize: z.number().min(1).max(500_000),
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

      if (userRow.creditsLimit !== -1 && userRow.creditsUsed >= userRow.creditsLimit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Credit limit reached. Upgrade your plan to continue.',
        });
      }

      const creditsRequired = Math.max(4, Math.ceil(input.contentSize / 10_000));

      const [analysis] = await ctx.db
        .insert(analyses)
        .values({
          workspaceId: ctx.workspaceId!,
          createdById: ctx.user!.id,
          filename: input.filename,
          language: input.language,
          status: 'pending',
          creditsCharged: creditsRequired,
        })
        .returning({ id: analyses.id });

      const { uploadUrl, storageKey } = await generatePresignedUploadUrl({
        bucket: process.env.R2_BUCKET ?? '',
        key: `code/${ctx.workspaceId!}/${analysis.id}/source`,
        ttl: 300,
      });

      await ctx.db
        .update(analyses)
        .set({ codeStorageKey: storageKey, updatedAt: new Date() })
        .where(eq(analyses.id, analysis.id));

      await insertAuditLog(ctx, {
        action: 'analysis.created',
        resourceType: 'analysis',
        resourceId: analysis.id,
      });

      return { analysisId: analysis.id, uploadUrl, creditsRequired };
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

      await enqueueAnalysis({
        analysisId: input.analysisId,
        workspaceId: ctx.workspaceId!,
      });

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
            issueCount: count(issues.id),
            fixedCount: sql<number>`COUNT(CASE WHEN ${issues.fixApplied} THEN 1 END)`,
            createdByName: users.name,
          })
          .from(analyses)
          .leftJoin(issues, eq(issues.analysisId, analyses.id))
          .leftJoin(users, eq(users.id, analyses.createdById))
          .where(and(...filters))
          .groupBy(analyses.id, users.name)
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
        .select()
        .from(issues)
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
