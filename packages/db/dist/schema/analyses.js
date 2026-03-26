import { pgEnum, pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';
import { users } from './users.js';
export const analysisStatusEnum = pgEnum('analysis_status', [
    'pending', 'processing', 'complete', 'failed', 'cancelled',
]);
export const languageEnum = pgEnum('language', [
    'typescript', 'javascript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp', 'ruby', 'php',
]);
export const analyses = pgTable('analyses', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    createdById: uuid('created_by_id').notNull().references(() => users.id),
    filename: text('filename').notNull(),
    language: languageEnum('language').notNull(),
    status: analysisStatusEnum('status').notNull().default('pending'),
    score: integer('score'),
    linesOfCode: integer('lines_of_code'),
    cyclomaticComplexity: integer('cyclomatic_complexity'),
    cognitiveComplexity: integer('cognitive_complexity'),
    duplicationPct: integer('duplication_pct').default(0),
    maintainabilityGrade: text('maintainability_grade'),
    testCoveragePct: integer('test_coverage_pct'),
    codeStorageKey: text('code_storage_key'),
    reportStorageKey: text('report_storage_key'),
    tokensUsed: integer('tokens_used').default(0),
    creditsCharged: integer('credits_charged').default(0),
    modelUsed: text('model_used'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').$type(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=analyses.js.map