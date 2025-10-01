-- Rename 'migrated' store to 'legacy' for better UX
-- Issue: https://github.com/runtipi/runtipi/issues/2327

--> statement-breakpoint
UPDATE "app_store"
SET
  slug = 'legacy',
  hash = 'legacy',
  name = 'legacy'
WHERE
  slug = 'migrated';

--> statement-breakpoint
UPDATE "app"
SET
  app_store_slug = 'legacy'
WHERE
  app_store_slug = 'migrated';
