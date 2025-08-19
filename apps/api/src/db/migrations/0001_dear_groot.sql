CREATE TABLE "explored_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hex_index" varchar(16) NOT NULL,
	"visited_at" timestamp DEFAULT now() NOT NULL,
	"exploration_method" varchar(20) NOT NULL,
	"speed" numeric(5, 2) NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"time_spent" numeric(8, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_achievements" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "location_points" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "unlocked_areas" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "achievements" CASCADE;--> statement-breakpoint
DROP TABLE "user_achievements" CASCADE;--> statement-breakpoint
DROP TABLE "group_members" CASCADE;--> statement-breakpoint
DROP TABLE "groups" CASCADE;--> statement-breakpoint
DROP TABLE "location_points" CASCADE;--> statement-breakpoint
DROP TABLE "unlocked_areas" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_latitude" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_longitude" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_hex_res8" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_location_update" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "estimated_distance" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "explored_areas" ADD CONSTRAINT "explored_areas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "explored_areas_user_id_idx" ON "explored_areas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "explored_areas_hex_idx" ON "explored_areas" USING btree ("hex_index");--> statement-breakpoint
CREATE INDEX "explored_areas_user_hex_idx" ON "explored_areas" USING btree ("user_id","hex_index");--> statement-breakpoint
CREATE INDEX "explored_areas_visited_at_idx" ON "explored_areas" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "explored_areas_method_idx" ON "explored_areas" USING btree ("exploration_method");--> statement-breakpoint
CREATE INDEX "users_current_hex_idx" ON "users" USING btree ("current_hex_res8");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "total_distance";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "total_area_unlocked";