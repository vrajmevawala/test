DO $$ BEGIN
IF to_regclass('public.analyses') IS NOT NULL THEN
	CREATE INDEX IF NOT EXISTS idx_analyses_workspace_created ON analyses (workspace_id, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_analyses_workspace_status ON analyses (workspace_id, status);
	CREATE INDEX IF NOT EXISTS idx_analyses_created_by ON analyses (created_by_id);
END IF;
END $$;

DO $$ BEGIN
IF to_regclass('public.issues') IS NOT NULL THEN
	CREATE INDEX IF NOT EXISTS idx_issues_analysis_id ON issues (analysis_id);
	CREATE INDEX IF NOT EXISTS idx_issues_analysis_severity ON issues (analysis_id, severity);
	CREATE INDEX IF NOT EXISTS idx_issues_analysis_fixable ON issues (analysis_id, fixable) WHERE fixable = true;
	CREATE INDEX IF NOT EXISTS idx_issues_fix_applied ON issues (analysis_id, fix_applied);
END IF;
END $$;

DO $$ BEGIN
IF to_regclass('public.team_members') IS NOT NULL THEN
	CREATE INDEX IF NOT EXISTS idx_team_members_workspace ON team_members (workspace_id, status);
	CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique ON team_members (workspace_id, user_id);
END IF;
END $$;

DO $$ BEGIN
IF to_regclass('public.audit_logs') IS NOT NULL THEN
	CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created ON audit_logs (workspace_id, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
END IF;
END $$;

DO $$ BEGIN
IF to_regclass('public.api_keys') IS NOT NULL THEN
	CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = true;
END IF;
END $$;

DO $$ BEGIN
IF to_regclass('public.conversations') IS NOT NULL THEN
	CREATE INDEX IF NOT EXISTS idx_conversations_user_workspace ON conversations (user_id, workspace_id, last_message_at DESC);
END IF;
END $$;
