ALTER TABLE "app_store" ADD COLUMN IF NOT EXISTS "deleted" boolean DEFAULT false NOT NULL;
