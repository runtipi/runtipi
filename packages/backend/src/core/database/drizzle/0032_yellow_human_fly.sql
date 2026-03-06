CREATE TABLE "oidc" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"clientId" varchar NOT NULL,
	"clientSecret" varchar NOT NULL,
	"authorizeUri" varchar NOT NULL,
	"tokenUri" varchar NOT NULL,
	"userinfoUri" varchar NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_trusted_subs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"providerId" integer NOT NULL,
	"sub" varchar NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
