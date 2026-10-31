CREATE TABLE "agent_credential" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"account_fingerprint" varchar(64) NOT NULL,
	"created_at" integer NOT NULL,
	"expires_at" integer NOT NULL,
	"last_used_at" integer,
	CONSTRAINT "agent_credential_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "agent_credential" ADD CONSTRAINT "agent_credential_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;