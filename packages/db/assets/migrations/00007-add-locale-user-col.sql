-- Create locale field if it doesn't exist
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "locale" character varying DEFAULT 'en';

-- Set default locale to en
UPDATE
    "user"
SET
    "locale" = 'en'
WHERE
    "locale" IS NULL;

-- Set locale column to not null constraint
ALTER TABLE "user"
    ALTER COLUMN "locale" SET NOT NULL;
