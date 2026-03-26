import { TRPCError } from '@trpc/server';
import { t } from './init.js';

export const authed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const inWorkspace = t.middleware(({ ctx, next }) => {
  if (!ctx.workspaceId || !ctx.memberRole) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Workspace access required.' });
  }

  return next({
    ctx: {
      ...ctx,
      workspaceId: ctx.workspaceId,
      memberRole: ctx.memberRole,
    },
  });
});

export const requireRole = (minRole: 'viewer' | 'developer' | 'admin' | 'owner') =>
  t.middleware(({ ctx, next }) => {
    const hierarchy = ['viewer', 'developer', 'admin', 'owner'];
    const current = hierarchy.indexOf(ctx.memberRole ?? '');
    const required = hierarchy.indexOf(minRole);

    if (current < required) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Role '${minRole}' or higher required.`,
      });
    }

    return next({ ctx });
  });

export const protectedProcedure = t.procedure.use(authed);
export const workspaceProcedure = protectedProcedure.use(inWorkspace);
export const developerProcedure = workspaceProcedure.use(requireRole('developer'));
export const adminProcedure = workspaceProcedure.use(requireRole('admin'));
