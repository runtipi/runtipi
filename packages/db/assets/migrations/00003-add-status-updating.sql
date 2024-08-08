DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
            1
        FROM
            pg_enum
        WHERE
            enumlabel = 'updating'::text
            AND enumtypid = 'public.app_status_enum'::regtype) THEN
    ALTER TYPE "public"."app_status_enum"
        ADD VALUE 'updating';
END IF;
END
$$;
