ALTER TABLE "app" ALTER COLUMN "user_config_enabled" SET DEFAULT true;--> statement-breakpoint

WITH ranked AS (
  SELECT
    id,
    subnet,
    ROW_NUMBER() OVER (
      PARTITION BY subnet
      ORDER BY id
    ) AS rn
  FROM "app"
)
UPDATE "app"
SET subnet = NULL
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

--> statement-breakpoint
ALTER TABLE "app" ADD CONSTRAINT "app_subnet_unique" UNIQUE("subnet");
