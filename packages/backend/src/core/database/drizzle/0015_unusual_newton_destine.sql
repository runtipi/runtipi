ALTER TABLE "app_store"
ALTER COLUMN "name"
SET
  DATA TYPE varchar(16);

--> statement-breakpoint
ALTER TABLE "app_store"
DROP COLUMN IF EXISTS "deleted";
