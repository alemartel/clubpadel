-- Multi-tenant: create tenants table and add tenant_id to business tables
CREATE TABLE IF NOT EXISTS "app"."tenants" (
  "id" text PRIMARY KEY NOT NULL,
  "host" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
INSERT INTO "app"."tenants" ("id", "host", "name") VALUES ('inplay', 'inplay.mypadelcenter.com', 'Inplay')
ON CONFLICT (id) DO NOTHING;

--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN IF NOT EXISTS "tenant_id" text;

--> statement-breakpoint
ALTER TABLE "app"."teams" ADD COLUMN IF NOT EXISTS "tenant_id" text;

--> statement-breakpoint
ALTER TABLE "app"."leagues" ADD COLUMN IF NOT EXISTS "tenant_id" text;

--> statement-breakpoint
ALTER TABLE "app"."events" ADD COLUMN IF NOT EXISTS "tenant_id" text;

--> statement-breakpoint
UPDATE "app"."users" SET tenant_id = 'inplay' WHERE tenant_id IS NULL;

--> statement-breakpoint
UPDATE "app"."teams" SET tenant_id = 'inplay' WHERE tenant_id IS NULL;

--> statement-breakpoint
UPDATE "app"."leagues" SET tenant_id = 'inplay' WHERE tenant_id IS NULL;

--> statement-breakpoint
UPDATE "app"."events" SET tenant_id = 'inplay' WHERE tenant_id IS NULL;

--> statement-breakpoint
ALTER TABLE "app"."users" DROP CONSTRAINT IF EXISTS "users_email_unique";

--> statement-breakpoint
ALTER TABLE "app"."users" ADD CONSTRAINT "users_tenant_email_unique" UNIQUE ("tenant_id", "email");

--> statement-breakpoint
ALTER TABLE "app"."teams" DROP CONSTRAINT IF EXISTS "teams_name_unique";

--> statement-breakpoint
ALTER TABLE "app"."teams" ADD CONSTRAINT "teams_tenant_name_unique" UNIQUE ("tenant_id", "name");

--> statement-breakpoint
ALTER TABLE "app"."leagues" ADD CONSTRAINT "leagues_tenant_name_unique" UNIQUE ("tenant_id", "name");

--> statement-breakpoint
ALTER TABLE "app"."events" ADD CONSTRAINT "events_tenant_name_unique" UNIQUE ("tenant_id", "name");

--> statement-breakpoint
ALTER TABLE "app"."users" ALTER COLUMN "tenant_id" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "app"."teams" ALTER COLUMN "tenant_id" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "app"."leagues" ALTER COLUMN "tenant_id" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "app"."events" ALTER COLUMN "tenant_id" SET NOT NULL;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "app"."users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "app"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "app"."teams" ADD CONSTRAINT "teams_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "app"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "app"."leagues" ADD CONSTRAINT "leagues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "app"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "app"."events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "app"."tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
