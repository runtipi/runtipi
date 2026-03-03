CREATE TABLE "oidc" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"clientId" varchar NOT NULL,
	"clientSecret" varchar NOT NULL,
	"authorizeUri" varchar NOT NULL,
	"tokenUri" varchar NOT NULL,
	"userInfoUri" varchar NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
