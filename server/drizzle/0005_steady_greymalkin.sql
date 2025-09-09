CREATE TABLE IF NOT EXISTS "app"."team_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"day_of_week" text NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"start_time" time,
	"end_time" time,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_availability_team_day_unique" UNIQUE("team_id","day_of_week")
);
