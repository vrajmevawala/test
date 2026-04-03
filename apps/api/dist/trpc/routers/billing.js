import { z } from 'zod';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { subscriptions, users } from '@codeopt/db/schema';
import { t } from '../init.js';
import { protectedProcedure } from '../middleware.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
export const billingRouter = t.router({
    subscription: protectedProcedure.query(async ({ ctx }) => {
        const [sub] = await ctx.db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, ctx.user.id))
            .orderBy(subscriptions.createdAt)
            .limit(1);
        const [user] = await ctx.db
            .select({
            plan: users.plan,
            creditsUsed: users.creditsUsed,
            creditsLimit: users.creditsLimit,
        })
            .from(users)
            .where(eq(users.id, ctx.user.id))
            .limit(1);
        return {
            subscription: sub ?? null,
            credits: user,
        };
    }),
    createCheckout: protectedProcedure
        .input(z.object({ priceId: z.string(), returnUrl: z.string().url() }))
        .mutation(async ({ ctx, input }) => {
        const [user] = await ctx.db
            .select({ stripeCustomerId: users.stripeCustomerId, email: users.email })
            .from(users)
            .where(eq(users.id, ctx.user.id))
            .limit(1);
        if (!user) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
        }
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: user.stripeCustomerId ?? undefined,
            customer_email: user.stripeCustomerId ? undefined : user.email,
            line_items: [{ price: input.priceId, quantity: 1 }],
            success_url: `${input.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: input.returnUrl,
            metadata: { userId: ctx.user.id },
        });
        return { url: session.url ?? '' };
    }),
    createPortal: protectedProcedure
        .input(z.object({ returnUrl: z.string().url() }))
        .mutation(async ({ ctx, input }) => {
        const [user] = await ctx.db
            .select({ stripeCustomerId: users.stripeCustomerId })
            .from(users)
            .where(eq(users.id, ctx.user.id))
            .limit(1);
        if (!user?.stripeCustomerId) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'No billing account found.' });
        }
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: input.returnUrl,
        });
        return { url: session.url };
    }),
});
//# sourceMappingURL=billing.js.map