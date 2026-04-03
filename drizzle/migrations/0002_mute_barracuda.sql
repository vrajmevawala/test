ALTER TYPE "public"."issue_category" ADD VALUE 'memory';--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "dimension" text;