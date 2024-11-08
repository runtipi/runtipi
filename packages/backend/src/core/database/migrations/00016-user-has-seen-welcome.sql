-- Create locale field if it doesn't exist
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "has_seen_welcome" boolean DEFAULT false;

-- Set default locale to en
UPDATE
    "user"
SET
    "has_seen_welcome" = false
WHERE
    "has_seen_welcome" IS NULL;

-- Set locale column to not null constraint
ALTER TABLE "user"
    ALTER COLUMN "has_seen_welcome" SET NOT NULL;
