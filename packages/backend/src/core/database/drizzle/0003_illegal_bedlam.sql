CREATE TABLE IF NOT EXISTS "app_store" (
  "id" serial PRIMARY KEY NOT NULL,
  "hash" varchar NOT NULL,
  "name" varchar NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "url" varchar NOT NULL,
  "branch" varchar DEFAULT 'main' NOT NULL,
  "createdAt" timestamp DEFAULT now () NOT NULL,
  "updatedAt" timestamp DEFAULT now () NOT NULL,
  CONSTRAINT "app_store_hash_unique" UNIQUE ("hash")
);

-- > statement-breakpoint
ALTER TABLE "app"
ADD COLUMN IF NOT EXISTS "app_store_id" integer;
