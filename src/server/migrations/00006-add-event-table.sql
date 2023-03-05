-- Create enum for event type running, success, error, waiting if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
            1
        FROM
            pg_type
        WHERE
            typname = 'event_status_enum') THEN
    CREATE TYPE "public"."event_status_enum" AS ENUM (
        'running',
        'success',
        'error',
        'waiting'
);
END IF;
END
$$;

-- Create event table
CREATE TABLE IF NOT EXISTS "event" (
    "id" serial NOT NULL,
    "status" "public"."event_status_enum" NOT NULL,
    "message" character varying NOT NULL,
    "type" character varying NOT NULL,
    "args" character varying[] NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);
