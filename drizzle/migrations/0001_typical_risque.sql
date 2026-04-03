ALTER TYPE "public"."language" ADD VALUE 'plaintext';--> statement-breakpoint
CREATE INDEX "idx_fixes_issue_id" ON "fixes" USING btree ("issue_id");