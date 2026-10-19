CREATE TABLE "app_migration" (
	"app_id" integer NOT NULL,
	"migration_id" varchar NOT NULL,
	CONSTRAINT "app_migration_app_id_migration_id_pk" PRIMARY KEY("app_id", "migration_id")
);
--> statement-breakpoint
ALTER TABLE "app_migration" ADD CONSTRAINT "app_migration_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."app"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "app" ADD COLUMN "migrations_baselined" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "app_restore_journal" (
	"app_id" integer PRIMARY KEY NOT NULL,
	"previous_state" jsonb NOT NULL,
	"target_state" jsonb NOT NULL,
	"directories" jsonb NOT NULL,
	"phase" varchar DEFAULT 'prepared' NOT NULL,
	CONSTRAINT "app_restore_journal_app_id_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."app"("id") ON DELETE cascade ON UPDATE no action
);
