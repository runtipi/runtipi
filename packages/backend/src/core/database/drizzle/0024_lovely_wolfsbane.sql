ALTER TABLE "app" ADD COLUMN "pending_restart" boolean DEFAULT false;

--> statement-breakpoint
UPDATE "app" SET "pending_restart" = false WHERE "pending_restart" IS NULL;

--> statement-breakpoint
ALTER TABLE "app" ALTER COLUMN "pending_restart" SET NOT NULL;
