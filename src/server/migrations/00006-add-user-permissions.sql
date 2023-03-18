-- Create permissions field (array of string) if it doesn't exist 
ALTER TABLE
    "user"
ADD
    COLUMN IF NOT EXISTS "permissions" character varying [] DEFAULT NULL;

-- Set empty permissions array to users with null permissions
UPDATE
    "user"
set
    "permissions" = '{}'
where
    "permissions" IS NULL;

-- Set permissions column to not null constraint
ALTER TABLE
    "user"
ALTER COLUMN
    "permissions"
SET
    NOT NULL;
