DO $$
BEGIN
    -- check if enum update_status_enum exists
    IF NOT EXISTS (
        SELECT
            1
        FROM
            pg_type
        WHERE
            typname = 'update_status_enum') THEN
    -- create enum
    CREATE TYPE "public"."update_status_enum" AS ENUM (
        'FAILED',
        'SUCCESS'
);
END IF;
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

CREATE TABLE IF NOT EXISTS "update" (
    "id" serial NOT NULL,
    "name" character varying NOT NULL,
    "status" "public"."update_status_enum" NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_6e7d7ecccdc972caa0ad33cb014" UNIQUE ("name"),
    CONSTRAINT "PK_575f77a0576d6293bc1cb752847" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user" (
    "id" serial NOT NULL,
    "username" character varying NOT NULL,
    "password" character varying NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"),
    CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "app" (
    "id" character varying NOT NULL,
    "status" "public"."app_status_enum" NOT NULL DEFAULT 'stopped',
    "lastOpened" timestamp with time zone DEFAULT now(),
    "numOpened" integer NOT NULL DEFAULT '0',
    "config" jsonb NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_9478629fc093d229df09e560aea" UNIQUE ("id"),
    CONSTRAINT "PK_9478629fc093d229df09e560aea" PRIMARY KEY ("id")
);
