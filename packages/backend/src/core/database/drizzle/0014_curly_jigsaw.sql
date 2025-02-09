ALTER TABLE "app"
ADD COLUMN IF NOT EXISTS "enable_auth" boolean DEFAULT false;

-- Select all apps that have not the enable_auth field and put it to false
UPDATE "app"
SET
  "enable_auth" = FALSE
WHERE
  "enable_auth" IS NULL;

-- Set enable_auth column to not null constraint
ALTER TABLE "app"
ALTER COLUMN "enable_auth"
SET
  NOT NULL;

