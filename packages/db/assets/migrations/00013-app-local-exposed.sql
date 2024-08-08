-- Create open_port field if it doesn't exist
ALTER TABLE "app"
    ADD COLUMN IF NOT EXISTS "open_port" boolean DEFAULT TRUE;

-- Select all apps that have not the open_port field and put it to true
UPDATE
    "app"
SET
    "open_port" = TRUE
WHERE
    "open_port" IS NULL;

-- Set exposed column to not null constraint
ALTER TABLE "app"
    ALTER COLUMN "open_port" SET NOT NULL;

-- Create exposed_local field if it doesn't exist
ALTER TABLE "app"
    ADD COLUMN IF NOT EXISTS "exposed_local" boolean DEFAULT TRUE;

-- Select all apps that have not the exposed_local field and put it to false
UPDATE
    "app"
SET
    "exposed_local" = TRUE
WHERE
    "exposed_local" IS NULL;

-- Set exposed_local column to not null constraint
ALTER TABLE "app"
    ALTER COLUMN "exposed_local" SET NOT NULL;
