CREATE TABLE "oidc_providers" (
	"version" integer DEFAULT 1 NOT NULL,
	"id" serial NOT NULL,
	"user_id" integer NOT NULL,
	"slug" varchar PRIMARY KEY NOT NULL,
	"displayName" varchar NOT NULL,
	"clientId" varchar NOT NULL,
	"clientSecret" varchar NOT NULL,
	"issuer" varchar NOT NULL,
	"discovery" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oidc_providers_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "oidc_trusted_subs" (
	"id" serial NOT NULL,
	"slug" varchar PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"sub" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD CONSTRAINT "oidc_providers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oidc_trusted_subs" ADD CONSTRAINT "oidc_trusted_subs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oidc_trusted_subs" ADD CONSTRAINT "oidc_trusted_subs_provider_id_oidc_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."oidc_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "oidc_trusted_subs_provider_sub_unique" ON "oidc_trusted_subs" USING btree ("provider_id","sub");