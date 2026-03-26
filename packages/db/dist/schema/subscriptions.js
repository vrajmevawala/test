import { pgEnum, pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';
export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'active', 'cancelled', 'past_due', 'trialing', 'incomplete',
]);
export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripePriceId: text('stripe_price_id'),
    status: subscriptionStatusEnum('status').notNull(),
    plan: text('plan').notNull(),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    seatsCount: integer('seats_count').default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=subscriptions.js.map