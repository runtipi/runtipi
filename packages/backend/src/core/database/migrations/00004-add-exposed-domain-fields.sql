-- Create exposed field if it doesn't exist
ALTER TABLE "app"
    ADD COLUMN IF NOT EXISTS "exposed" boolean DEFAULT FALSE;

-- Select all apps that have not the exposed field and put it to false
UPDATE
    "app"
SET
    "exposed" = FALSE
WHERE
    "exposed" IS NULL;

-- Set exposed column to not null constraint
ALTER TABLE "app"
    ALTER COLUMN "exposed" SET NOT NULL;

-- Create domain column if it doesn't exist
ALTER TABLE "app"
    ADD COLUMN IF NOT EXISTS "domain" character varying;

-- Set default version to 1
ALTER TABLE "app"
    ALTER COLUMN "version" SET DEFAULT '1';
