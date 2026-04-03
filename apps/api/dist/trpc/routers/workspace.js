import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { t } from '../init.js';
import { protectedProcedure, workspaceProcedure } from '../middleware.js';
import { workspaces, teamMembers } from '@codeopt/db/schema';
import { TRPCError } from '@trpc/server';
import { insertAuditLog } from '../../lib/audit.js';
export const workspaceRouter = t.router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select({
            id: workspaces.id,
            name: workspaces.name,
            slug: workspaces.slug,
            ownerId: workspaces.ownerId,
            role: teamMembers.role,
            status: teamMembers.status,
        })
            .from(teamMembers)
            .innerJoin(workspaces, eq(workspaces.id, teamMembers.workspaceId))
            .where(and(eq(teamMembers.userId, ctx.user.id), eq(teamMembers.status, 'active')));
    }),
    create: protectedProcedure
        .input(z.object({ name: z.string().min(1).max(120), slug: z.string().min(2).max(120) }))
        .mutation(async ({ ctx, input }) => {
        const [workspace] = await ctx.db
            .insert(workspaces)
            .values({
            name: input.name,
            slug: input.slug,
            ownerId: ctx.user.id,
        })
            .returning({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug });
        await ctx.db.insert(teamMembers).values({
            workspaceId: workspace.id,
            userId: ctx.user.id,
            role: 'owner',
            status: 'active',
            joinedAt: new Date(),
        });
        return workspace;
    }),
    current: workspaceProcedure.query(async ({ ctx }) => {
        const [workspace] = await ctx.db
            .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug, ownerId: workspaces.ownerId })
            .from(workspaces)
            .where(eq(workspaces.id, ctx.workspaceId))
            .limit(1);
        if (!workspace) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found.' });
        }
        return workspace;
    }),
    update: workspaceProcedure
        .input(z.object({ name: z.string().min(1).max(120).optional(), defaultBranch: z.string().min(1).max(120).optional() }))
        .mutation(async ({ ctx, input }) => {
        const [updated] = await ctx.db
            .update(workspaces)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(workspaces.id, ctx.workspaceId))
            .returning({ id: workspaces.id, name: workspaces.name, defaultBranch: workspaces.defaultBranch });
        if (!updated) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found.' });
        }
        await insertAuditLog(ctx, {
            action: 'workspace.updated',
            resourceType: 'workspace',
            resourceId: ctx.workspaceId,
            after: input,
        });
        return updated;
    }),
});
//# sourceMappingURL=workspace.js.map