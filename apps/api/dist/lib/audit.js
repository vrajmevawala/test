import { auditLogs } from '@codeopt/db/schema';
export async function insertAuditLog(ctx, entry) {
    await ctx.db.insert(auditLogs).values({
        actorId: ctx.user?.id,
        workspaceId: ctx.workspaceId ?? undefined,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        before: entry.before,
        after: entry.after,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent'],
    });
}
//# sourceMappingURL=audit.js.map