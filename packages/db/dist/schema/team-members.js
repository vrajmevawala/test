import { pgEnum, pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { workspaces } from './workspaces.js';
export const roleEnum = pgEnum('member_role', ['owner', 'admin', 'developer', 'viewer']);
export const memberStatusEnum = pgEnum('member_status', ['active', 'invited', 'suspended']);
export const teamMembers = pgTable('team_members', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull().default('developer'),
    status: memberStatusEnum('status').notNull().default('active'),
    invitedBy: uuid('invited_by').references(() => users.id),
    inviteToken: text('invite_token').unique(),
    inviteEmail: text('invite_email'),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=team-members.js.map