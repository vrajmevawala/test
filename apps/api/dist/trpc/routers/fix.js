import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { analyses, fixes, issues } from '@codeopt/db/schema';
import { t } from '../init.js';
import { developerProcedure } from '../middleware.js';
import { insertAuditLog } from '../../lib/audit.js';
export const fixRouter = t.router({
    byIssue: developerProcedure
        .input(z.object({ issueId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
        const [issue] = await ctx.db
            .select({ id: issues.id })
            .from(issues)
            .innerJoin(analyses, eq(analyses.id, issues.analysisId))
            .where(and(eq(issues.id, input.issueId), eq(analyses.workspaceId, ctx.workspaceId)))
            .limit(1);
        if (!issue) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Issue not found.' });
        }
        const [fix] = await ctx.db.select().from(fixes).where(eq(fixes.issueId, input.issueId)).limit(1);
        if (!fix) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'No fix generated yet.' });
        }
        return { ...fix };
    }),
    apply: developerProcedure
        .input(z.object({
        issueId: z.string().uuid(),
        rating: z.number().min(1).max(5).optional(),
    }))
        .mutation(async ({ ctx, input }) => {
        const [issue] = await ctx.db
            .select({ id: issues.id, fixApplied: issues.fixApplied })
            .from(issues)
            .innerJoin(analyses, eq(analyses.id, issues.analysisId))
            .where(and(eq(issues.id, input.issueId), eq(analyses.workspaceId, ctx.workspaceId)))
            .limit(1);
        if (!issue) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Issue not found.' });
        }
        if (issue.fixApplied) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Fix already applied.' });
        }
        await ctx.db
            .update(issues)
            .set({ fixApplied: true, fixAppliedAt: new Date(), fixAppliedBy: ctx.user.id })
            .where(eq(issues.id, input.issueId));
        await ctx.db
            .update(fixes)
            .set({
            status: 'applied',
            appliedById: ctx.user.id,
            appliedAt: new Date(),
            ...(input.rating ? { userRating: input.rating } : {}),
        })
            .where(eq(fixes.issueId, input.issueId));
        await insertAuditLog(ctx, {
            action: 'fix.applied',
            resourceType: 'issue',
            resourceId: input.issueId,
        });
        return { applied: true };
    }),
    reject: developerProcedure
        .input(z.object({
        issueId: z.string().uuid(),
        rating: z.number().min(1).max(5).optional(),
    }))
        .mutation(async ({ ctx, input }) => {
        await ctx.db
            .update(fixes)
            .set({ status: 'rejected', ...(input.rating ? { userRating: input.rating } : {}) })
            .where(eq(fixes.issueId, input.issueId));
        await insertAuditLog(ctx, {
            action: 'fix.rejected',
            resourceType: 'issue',
            resourceId: input.issueId,
        });
        return { rejected: true };
    }),
});
//# sourceMappingURL=fix.js.map