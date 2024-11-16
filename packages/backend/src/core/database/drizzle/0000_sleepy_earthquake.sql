DO $$
BEGIN
    -- check if enum app_status_enum exists
    IF NOT EXISTS (
        SELECT
            1
        FROM
            pg_type
        WHERE
            typname = 'app_status_enum') THEN
    -- create enum
    CREATE TYPE "public"."app_status_enum" AS ENUM (
        'running',
        'stopped',
        'installing',
        'uninstalling',
        'stopping',
        'starting',
        'missing'
);
END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "migrations" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"hash" varchar(40) NOT NULL,
	"executed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "migrations_name_key" UNIQUE("name")
);
-- > statement-breakpoint
CREATE TABLE IF NOT EXISTS "link" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(20) NOT NULL,
	"url" varchar NOT NULL,
	"icon_url" varchar,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"description" varchar(50)
);
-- > statement-breakpoint
CREATE TABLE IF NOT EXISTS "app" (
	"id" varchar PRIMARY KEY NOT NULL,
	"status" "app_status_enum" DEFAULT 'stopped' NOT NULL,
	"lastOpened" timestamp with time zone DEFAULT now(),
	"numOpened" integer DEFAULT 0 NOT NULL,
	"config" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"exposed" boolean DEFAULT false NOT NULL,
	"domain" varchar,
	"is_visible_on_guest_dashboard" boolean DEFAULT false NOT NULL,
	"open_port" boolean DEFAULT true NOT NULL,
	"exposed_local" boolean DEFAULT true NOT NULL,
	CONSTRAINT "UQ_9478629fc093d229df09e560aea" UNIQUE("id")
);
-- > statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"password" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"operator" boolean DEFAULT false NOT NULL,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"salt" text,
	"locale" varchar DEFAULT 'en' NOT NULL,
	CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE("username")
);
-- > statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link" ADD CONSTRAINT "FK_link_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

