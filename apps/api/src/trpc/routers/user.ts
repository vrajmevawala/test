import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { users } from '@codeopt/db/schema';
import { t } from '../init.js';
import { protectedProcedure } from '../middleware.js';

export const userRouter = t.router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        plan: users.plan,
        creditsUsed: users.creditsUsed,
        creditsLimit: users.creditsLimit,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.user!.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    return user;
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128).optional(),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, ctx.user!.id))
        .returning({ id: users.id, name: users.name, avatarUrl: users.avatarUrl });

      return updated;
    }),

  syncFromClerk: protectedProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        name: z.string().min(1),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(users)
        .values({
          clerkId: input.clerkId,
          email: input.email,
          name: input.name,
          avatarUrl: input.avatarUrl,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: input.email,
            name: input.name,
            avatarUrl: input.avatarUrl,
            updatedAt: new Date(),
          },
        });

      return { synced: true };
    }),
});
