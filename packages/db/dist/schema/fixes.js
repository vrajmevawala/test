import { pgEnum, pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { issues } from './issues.js';
import { users } from './users.js';
export const fixStatusEnum = pgEnum('fix_status', ['pending', 'applied', 'rejected', 'reverted']);
export const fixes = pgTable('fixes', {
    id: uuid('id').defaultRandom().primaryKey(),
    issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
    appliedById: uuid('applied_by_id').references(() => users.id),
    status: fixStatusEnum('status').notNull().default('pending'),
    diffStorageKey: text('diff_storage_key'),
    originalCode: text('original_code'),
    fixedCode: text('fixed_code'),
    explanation: text('explanation'),
    confidenceScore: integer('confidence_score'),
    userRating: integer('user_rating'),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=fixes.js.map