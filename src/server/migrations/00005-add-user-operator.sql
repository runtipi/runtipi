-- Create operator field if it doesn't exist
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "operator" boolean DEFAULT NULL;

UPDATE
    "user"
SET
    "operator" = TRUE
WHERE
    "operator" IS NULL;

-- Set operator column to default false
ALTER TABLE "user"
    ALTER COLUMN "operator" SET DEFAULT FALSE;

-- Set operator column to not null constraint
ALTER TABLE "user"
    ALTER COLUMN "operator" SET NOT NULL;
