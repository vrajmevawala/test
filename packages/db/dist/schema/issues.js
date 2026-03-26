import { pgEnum, pgTable, uuid, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { analyses } from './analyses.js';
export const severityEnum = pgEnum('severity', ['error', 'warning', 'info']);
export const issueCategoryEnum = pgEnum('issue_category', [
    'security', 'performance', 'complexity', 'style', 'best-practice', 'bug',
]);
export const issues = pgTable('issues', {
    id: uuid('id').defaultRandom().primaryKey(),
    analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
    line: integer('line').notNull(),
    col: integer('col').notNull().default(0),
    endLine: integer('end_line'),
    severity: severityEnum('severity').notNull(),
    category: issueCategoryEnum('category').notNull(),
    rule: text('rule').notNull(),
    message: text('message').notNull(),
    suggestion: text('suggestion'),
    codeSnippet: text('code_snippet'),
    fixable: boolean('fixable').notNull().default(false),
    fixApplied: boolean('fix_applied').notNull().default(false),
    fixAppliedAt: timestamp('fix_applied_at', { withTimezone: true }),
    fixAppliedBy: uuid('fix_applied_by'),
    metadata: jsonb('metadata').$type(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=issues.js.map