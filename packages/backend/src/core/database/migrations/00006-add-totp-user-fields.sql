-- Create totp_secret field if it doesn't exist
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "totp_secret" text DEFAULT NULL;

-- Create totp_enabled field if it doesn't exist
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT FALSE;

-- Add salt field to user table
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "salt" text DEFAULT NULL;

-- Set all users to have totp enabled false
UPDATE
    "user"
SET
    "totp_enabled" = FALSE
WHERE
    "totp_enabled" IS NULL;

-- Set totp_enabled column to not null constraint
ALTER TABLE "user"
    ALTER COLUMN "totp_enabled" SET NOT NULL;
