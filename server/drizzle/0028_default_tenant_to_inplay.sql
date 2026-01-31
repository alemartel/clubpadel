-- Migrate existing "default" tenant to "inplay" (for DBs that already ran 0027 with 'default')
-- New installs use 0027 with 'inplay' directly; run this only if you have tenant_id = 'default'.

--> statement-breakpoint
INSERT INTO "app"."tenants" ("id", "host", "name") VALUES ('inplay', 'inplay.mypadelcenter.com', 'Inplay')
ON CONFLICT (id) DO NOTHING;

--> statement-breakpoint
UPDATE "app"."users" SET tenant_id = 'inplay' WHERE tenant_id = 'default';

--> statement-breakpoint
UPDATE "app"."teams" SET tenant_id = 'inplay' WHERE tenant_id = 'default';

--> statement-breakpoint
UPDATE "app"."leagues" SET tenant_id = 'inplay' WHERE tenant_id = 'default';

--> statement-breakpoint
UPDATE "app"."events" SET tenant_id = 'inplay' WHERE tenant_id = 'default';

--> statement-breakpoint
DELETE FROM "app"."tenants" WHERE id = 'default';
