CREATE TABLE IF NOT EXISTS "link" (
    "id" serial NOT NULL,
    "title" character varying(20) NOT NULL,
    "url" character varying NOT NULL,
    "icon_url" character varying,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    "user_id" integer NOT NULL,
    CONSTRAINT "PK_link" PRIMARY KEY ("id"),
    CONSTRAINT "FK_link_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);
