-- Update app table to add "is_visible_on_guest_dashboard" column
ALTER TABLE "app"
    ADD COLUMN IF NOT EXISTS "is_visible_on_guest_dashboard" boolean DEFAULT FALSE;

-- Set default value to false
UPDATE
    "app"
SET
    "is_visible_on_guest_dashboard" = FALSE
WHERE
    "is_visible_on_guest_dashboard" IS NULL;

-- Set is_visible_on_guest_dashboard column to not null constraint
ALTER TABLE "app"
    ALTER COLUMN "is_visible_on_guest_dashboard" SET NOT NULL;
