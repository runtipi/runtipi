CREATE TABLE IF NOT EXISTS "app_store" (
  "slug" varchar PRIMARY KEY NOT NULL,
  "hash" varchar NOT NULL,
  "name" varchar NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "url" varchar NOT NULL,
  "branch" varchar DEFAULT 'main' NOT NULL,
  "createdAt" timestamp DEFAULT now () NOT NULL,
  "updatedAt" timestamp DEFAULT now () NOT NULL,
  "deleted" boolean DEFAULT false NOT NULL,
  CONSTRAINT "app_store_hash_unique" UNIQUE ("hash")
);

--> statement-breakpoint
ALTER TABLE IF EXISTS "migrations" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE IF EXISTS "update" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint
DROP TABLE IF EXISTS "migrations" CASCADE;

--> statement-breakpoint
DROP TABLE IF EXISTS "update" CASCADE;

--> statement-breakpoint
ALTER TABLE "app"
DROP CONSTRAINT IF EXISTS "UQ_9478629fc093d229df09e560aea";

--> statement-breakpoint
ALTER TABLE "user"
DROP CONSTRAINT IF EXISTS "UQ_78a916df40e02a9deb1c4b75edb";

--> statement-breakpoint
ALTER TABLE "link"
DROP CONSTRAINT IF EXISTS "FK_link_user_id";

-- CUSTOM
--> statement-breakpoint
ALTER TABLE "app"
ADD COLUMN IF NOT EXISTS "app_store_slug" varchar;

--> statement-breakpoint
ALTER TABLE "app"
ADD COLUMN IF NOT EXISTS "app_name" varchar;

--> statement-breakpoint
WITH
  cte AS (
    SELECT
      id
    FROM
      app
    WHERE
      app_name IS NULL
  )
UPDATE app
SET
  app_name = cte.id
FROM
  cte
WHERE
  app.id = cte.id;

--> statement-breakpoint
ALTER TABLE "app"
ADD COLUMN new_id INTEGER;

--> statement-breakpoint
WITH
  cte AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        ORDER BY
          id
      ) AS row_number
    FROM
      app
  )
UPDATE app
SET
  new_id = cte.row_number
FROM
  cte
WHERE
  app.id = cte.id;

--> statement-breakpoint
ALTER TABLE "app"
DROP COLUMN id;

--> statement-breakpoint
ALTER TABLE "app"
RENAME COLUMN "new_id" TO "id";

--> statement-breakpoint
ALTER TABLE "app" ADD PRIMARY KEY ("id");

--> statement-breakpoint
ALTER TABLE "app"
ALTER COLUMN "app_name"
SET
  NOT NULL;

INSERT INTO
  "app_store" ("slug", "hash", "name", "url", "branch")
VALUES
  (
    'migrated',
    'migrated',
    'migrated',
    'migrated',
    'main'
  );

--> statement-breakpoint
UPDATE app
SET
  app_store_slug = 'migrated';

--> statement-breakpoint
CREATE SEQUENCE app_id_seq;

--> statement-breakpoint
ALTER TABLE app
ALTER COLUMN id
SET DEFAULT nextval ('app_id_seq');

--> statement-breakpoint
SELECT
  setval (
    'app_id_seq',
    COALESCE(
      (
        SELECT
          MAX(id)
        FROM
          app
      ),
      1
    )
  );

-- END CUSTOM
--> statement-breakpoint
ALTER TABLE "app" ADD CONSTRAINT "app_app_store_slug_app_store_slug_fk" FOREIGN KEY ("app_store_slug") REFERENCES "public"."app_store" ("slug") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "app"
ALTER COLUMN "app_store_slug"
SET
  NOT NULL;

--> statement-breakpoint
ALTER TABLE "app"
DROP COLUMN "lastOpened";

--> statement-breakpoint
ALTER TABLE "app"
DROP COLUMN "numOpened";
