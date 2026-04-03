import { randomUUID } from 'crypto';
import { z } from 'zod';
import { and, avg, count, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { analyses, teamMembers, users } from '@codeopt/db/schema';
import { t } from '../init.js';
import { adminProcedure, workspaceProcedure } from '../middleware.js';
import { sendInviteEmail } from '../../lib/email.js';
import { insertAuditLog } from '../../lib/audit.js';
export const teamRouter = t.router({
    members: workspaceProcedure.query(async ({ ctx }) => {
        const rows = await ctx.db
            .select({
            memberId: teamMembers.id,
            userId: teamMembers.userId,
            role: teamMembers.role,
            status: teamMembers.status,
            joinedAt: teamMembers.joinedAt,
            inviteEmail: teamMembers.inviteEmail,
            userName: users.name,
            userEmail: users.email,
            userAvatar: users.avatarUrl,
            analysesCount: count(analyses.id),
            avgScore: avg(analyses.score),
        })
            .from(teamMembers)
            .leftJoin(users, eq(users.id, teamMembers.userId))
            .leftJoin(analyses, and(eq(analyses.createdById, teamMembers.userId), eq(analyses.workspaceId, ctx.workspaceId), eq(analyses.status, 'complete')))
            .where(eq(teamMembers.workspaceId, ctx.workspaceId))
            .groupBy(teamMembers.id, teamMembers.userId, teamMembers.role, teamMembers.status, teamMembers.joinedAt, teamMembers.inviteEmail, users.name, users.email, users.avatarUrl)
            .orderBy(teamMembers.joinedAt);
        return rows.map((r) => ({
            ...r,
            analysesCount: Number(r.analysesCount),
            avgScore: r.avgScore ? Math.round(Number(r.avgScore)) : null,
        }));
    }),
    invite: adminProcedure
        .input(z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'developer', 'viewer']).default('developer'),
    }))
        .mutation(async ({ ctx, input }) => {
        const [{ seatCount }] = await ctx.db
            .select({ seatCount: count(teamMembers.id) })
            .from(teamMembers)
            .where(and(eq(teamMembers.workspaceId, ctx.workspaceId), eq(teamMembers.status, 'active')));
        const seatLimit = ctx.user.plan === 'free' ? 1 : ctx.user.plan === 'pro' ? 1 : 50;
        if (Number(seatCount) >= seatLimit) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Seat limit reached. Upgrade your plan to add more members.',
            });
        }
        const token = randomUUID();
        await ctx.db.insert(teamMembers).values({
            workspaceId: ctx.workspaceId,
            userId: ctx.user.id,
            role: input.role,
            status: 'invited',
            invitedBy: ctx.user.id,
            inviteToken: token,
            inviteEmail: input.email,
        });
        await sendInviteEmail({
            to: input.email,
            token,
            workspaceName: ctx.workspaceId,
        });
        await insertAuditLog(ctx, {
            action: 'team.member_invited',
            resourceType: 'team_member',
            after: { email: input.email, role: input.role },
        });
        return { invited: true };
    }),
    updateRole: adminProcedure
        .input(z.object({
        memberId: z.string().uuid(),
        role: z.enum(['admin', 'developer', 'viewer']),
    }))
        .mutation(async ({ ctx, input }) => {
        const [updated] = await ctx.db
            .update(teamMembers)
            .set({ role: input.role })
            .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.workspaceId, ctx.workspaceId)))
            .returning({ id: teamMembers.id, role: teamMembers.role });
        if (!updated) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Team member not found.' });
        }
        await insertAuditLog(ctx, {
            action: 'team.member_role_updated',
            resourceType: 'team_member',
            resourceId: input.memberId,
            after: { role: input.role },
        });
        return updated;
    }),
    join: workspaceProcedure
        .input(z.object({ workspaceId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
        // Check if already a member
        const [existing] = await ctx.db
            .select({ id: teamMembers.id })
            .from(teamMembers)
            .where(and(eq(teamMembers.workspaceId, input.workspaceId), eq(teamMembers.userId, ctx.user.id)))
            .limit(1);
        if (existing) {
            return { joined: true, alreadyMember: true };
        }
        await ctx.db.insert(teamMembers).values({
            workspaceId: input.workspaceId,
            userId: ctx.user.id,
            role: 'developer',
            status: 'active',
            joinedAt: new Date(),
        });
        await insertAuditLog(ctx, {
            action: 'team.member_joined',
            resourceType: 'workspace',
            resourceId: input.workspaceId,
        });
        return { joined: true };
    }),
    removeMember: adminProcedure
        .input(z.object({ memberId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
        const [removed] = await ctx.db
            .delete(teamMembers)
            .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.workspaceId, ctx.workspaceId)))
            .returning({ id: teamMembers.id });
        if (!removed) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Team member not found.' });
        }
        await insertAuditLog(ctx, {
            action: 'team.member_removed',
            resourceType: 'team_member',
            resourceId: input.memberId,
        });
        return { removed: true };
    }),
});
//# sourceMappingURL=team.js.map