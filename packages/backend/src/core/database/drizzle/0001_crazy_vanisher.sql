ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "has_seen_welcome" boolean DEFAULT false NOT NULL;
