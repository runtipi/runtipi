CREATE TABLE "oidc_providers" (
	"id" serial NOT NULL UNIQUE,
    "user_id" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "slug" varchar NOT NULL PRIMARY KEY,
	"displayName" varchar NOT NULL,
	"clientId" varchar NOT NULL,
	"clientSecret" varchar NOT NULL,
	"authorizeUrl" varchar NOT NULL,
	"tokenUrl" varchar NOT NULL,
	"userInfoUrl" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_trusted_subs" (
    "id" serial NOT NULL,
    "slug" varchar NOT NULL UNIQUE PRIMARY KEY ,
    "user_id" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "provider_id" integer NOT NULL REFERENCES "oidc_providers"("id") ON DELETE CASCADE,
    "sub" varchar NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);