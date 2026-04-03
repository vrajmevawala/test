import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@codeopt/db';
import { subscriptions, users, auditLogs } from '@codeopt/db/schema';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
const PLAN_MAP = {
    [process.env.STRIPE_PRICE_PRO ?? '']: 'pro',
    [process.env.STRIPE_PRICE_TEAM ?? '']: 'team',
    [process.env.STRIPE_PRICE_ENTERPRISE ?? '']: 'enterprise',
};
const CREDIT_MAP = {
    free: 500,
    pro: 10_000,
    team: -1,
    enterprise: -1,
};
export const webhookRoute = async (app) => {
    app.post('/stripe', async (req, reply) => {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            return reply.status(400).send({ error: 'Missing signature' });
        }
        let event;
        try {
            const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
        }
        catch {
            return reply.status(400).send({ error: 'Invalid webhook signature' });
        }
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.userId;
                if (userId && session.customer) {
                    await db.update(users).set({ stripeCustomerId: String(session.customer) }).where(eq(users.id, userId));
                    await db.insert(auditLogs).values({
                        actorId: userId,
                        action: 'billing.checkout_completed',
                        resourceType: 'subscription',
                    });
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const priceId = sub.items.data[0]?.price.id ?? '';
                const plan = PLAN_MAP[priceId] ?? 'free';
                const [user] = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.stripeCustomerId, String(sub.customer)))
                    .limit(1);
                if (!user) {
                    break;
                }
                await Promise.all([
                    db
                        .update(users)
                        .set({
                        plan,
                        creditsLimit: CREDIT_MAP[plan],
                        updatedAt: new Date(),
                    })
                        .where(eq(users.id, user.id)),
                    db
                        .insert(subscriptions)
                        .values({
                        userId: user.id,
                        stripeSubscriptionId: sub.id,
                        stripePriceId: priceId,
                        status: sub.status,
                        plan,
                        currentPeriodStart: new Date(sub.current_period_start * 1000),
                        currentPeriodEnd: new Date(sub.current_period_end * 1000),
                        cancelAtPeriodEnd: sub.cancel_at_period_end,
                    })
                        .onConflictDoUpdate({
                        target: subscriptions.stripeSubscriptionId,
                        set: {
                            status: sub.status,
                            plan,
                            currentPeriodEnd: new Date(sub.current_period_end * 1000),
                            cancelAtPeriodEnd: sub.cancel_at_period_end,
                            updatedAt: new Date(),
                        },
                    }),
                    db.insert(auditLogs).values({
                        actorId: user.id,
                        action: 'billing.subscription_updated',
                        resourceType: 'subscription',
                        resourceId: sub.id,
                        after: { plan, status: sub.status },
                    }),
                ]);
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const [user] = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.stripeCustomerId, String(sub.customer)))
                    .limit(1);
                if (!user) {
                    break;
                }
                await Promise.all([
                    db.update(users).set({ plan: 'free', creditsLimit: 500, updatedAt: new Date() }).where(eq(users.id, user.id)),
                    db
                        .update(subscriptions)
                        .set({ status: 'cancelled', updatedAt: new Date() })
                        .where(eq(subscriptions.stripeSubscriptionId, sub.id)),
                    db.insert(auditLogs).values({
                        actorId: user.id,
                        action: 'billing.subscription_cancelled',
                        resourceType: 'subscription',
                        resourceId: sub.id,
                    }),
                ]);
                break;
            }
            default:
                break;
        }
        return reply.status(200).send({ received: true });
    });
    app.post('/clerk', async (req, reply) => {
        const { type, data } = req.body;
        if (type === 'user.created' || type === 'user.updated') {
            const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Unknown User';
            const email = data.email_addresses?.[0]?.email_address;
            if (email) {
                await db
                    .insert(users)
                    .values({
                    clerkId: data.id,
                    email,
                    name,
                    avatarUrl: data.image_url,
                })
                    .onConflictDoUpdate({
                    target: users.clerkId,
                    set: {
                        email,
                        name,
                        avatarUrl: data.image_url,
                        updatedAt: new Date(),
                    },
                });
            }
        }
        return reply.status(200).send({ received: true });
    });
};
//# sourceMappingURL=webhook.js.map