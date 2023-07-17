-- Create table backup if it doesn't exist
CREATE TABLE IF NOT EXISTS "backup" (
    "id" serial NOT NULL,
    "app_id" character varying,
    "filename" character varying NOT NULL,
    "version" character varying NOT NULL,
    "size" bigint NOT NULL DEFAULT '0',
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("app_id") REFERENCES "app" ("id") ON DELETE CASCADE
);
