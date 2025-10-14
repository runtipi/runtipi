ALTER TABLE "app" ALTER COLUMN "exposed_local" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "app" ADD COLUMN "max_backups" integer;