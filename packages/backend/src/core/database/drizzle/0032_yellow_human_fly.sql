CREATE TABLE "oidc" (
	"id" serial PRIMARY KEY NOT NULL UNIQUE ,
	"name" varchar NOT NULL,
	"clientId" varchar NOT NULL,
	"clientSecret" varchar NOT NULL,
	"authorizeUri" varchar NOT NULL,
	"tokenUri" varchar NOT NULL,
	"userinfoUri" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_trusted_subs" (
    "id" serial PRIMARY KEY UNIQUE ,
    "user_id" integer NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "provider_id" integer NOT NULL REFERENCES "oidc"("id") ON DELETE CASCADE,
    "sub" varchar NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
);