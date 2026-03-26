import { auditLogs } from '@codeopt/db/schema';
import type { Context } from '../trpc/context.js';

export async function insertAuditLog(
  ctx: Context,
  entry: {
    action: string;
    resourceType?: string;
    resourceId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  },
) {
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
