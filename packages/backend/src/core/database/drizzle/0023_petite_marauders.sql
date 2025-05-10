ALTER TABLE "link" ADD COLUMN "is_visible_on_guest_dashboard" boolean DEFAULT false;

--> statement-breakpoint
UPDATE "link" SET "is_visible_on_guest_dashboard" = false WHERE "is_visible_on_guest_dashboard" IS NULL;

--> statement-breakpoint
ALTER TABLE "link" ALTER COLUMN "is_visible_on_guest_dashboard" SET NOT NULL;

