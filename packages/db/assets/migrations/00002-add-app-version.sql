-- Create version field if it doesn't exist
ALTER TABLE "app"
    ADD COLUMN IF NOT EXISTS "version" integer DEFAULT '0';

-- Set version field to 1 for all apps that have no version
UPDATE
    "app"
SET
    "version" = '1'
WHERE
    "version" IS NULL
    OR "version" = '0';

-- Set version field to not null
ALTER TABLE "app"
    ALTER COLUMN "version" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
            *
        FROM
            information_schema.table_constraints
        WHERE
            constraint_name = 'UQ_9478629fc093d229df09e560aea'
            AND table_name = 'app') THEN
    ALTER TABLE "app"
        ADD CONSTRAINT "UQ_9478629fc093d229df09e560aea" UNIQUE ("id");
END IF;
END
$$;
