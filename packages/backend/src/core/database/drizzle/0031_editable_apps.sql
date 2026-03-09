-- Add template tracking columns
ALTER TABLE "app" ADD COLUMN "template_urn" varchar;--> statement-breakpoint
ALTER TABLE "app" ADD COLUMN "last_template_sync_at" integer;--> statement-breakpoint
ALTER TABLE "app" ADD COLUMN "template_version" integer;--> statement-breakpoint

UPDATE "app" SET
  template_urn = app_name || ':' || app_store_slug,
  last_template_sync_at = extract(epoch from now()),
  template_version = version;
