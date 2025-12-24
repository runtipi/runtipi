ALTER TABLE "app" ADD COLUMN "created_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "app" ADD COLUMN "updated_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "app_store" ADD COLUMN "created_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "app_store" ADD COLUMN "updated_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN "created_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "link" ADD COLUMN "updated_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "created_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "updated_at" integer DEFAULT extract(epoch from now()) NOT NULL;--> statement-breakpoint
ALTER TABLE "app" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "app" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "app_store" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "app_store" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "link" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "link" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "updatedAt";