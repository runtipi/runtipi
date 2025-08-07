ALTER TABLE "app" ALTER COLUMN "user_config_enabled" SET DEFAULT true;--> statement-breakpoint

UPDATE "app" SET "subnet" = NULL WHERE "subnet" IS NOT NULL;
ALTER TABLE "app" ADD CONSTRAINT "app_subnet_unique" UNIQUE("subnet");
