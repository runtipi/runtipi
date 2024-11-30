DO $$ BEGIN
 ALTER TABLE "app" ADD CONSTRAINT "app_app_store_id_app_store_id_fk" FOREIGN KEY ("app_store_id") REFERENCES "public"."app_store"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
