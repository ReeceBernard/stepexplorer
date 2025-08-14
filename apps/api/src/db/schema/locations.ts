import {
  decimal,
  index,
  pgTable,
  point,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const locationPoints = pgTable(
  "location_points",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userID: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    location: point("location", { mode: "xy" }).notNull(), // Returns {x: lng, y: lat}
    speed: decimal("speed", { precision: 5, scale: 2 }).notNull(), // mph
    accuracy: decimal("accuracy", { precision: 8, scale: 2 }).notNull(), // meters
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => [
    index("location_points_user_id_idx").on(table.userID),
    index("location_points_recorded_at_idx").on(table.recordedAt),
    // FIXED: Use spatial index for point column instead of btree
    index("location_points_location_idx").using("gist", table.location),
  ]
);

export const unlockedAreas = pgTable(
  "unlocked_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    centerPoint: point("center_point", { mode: "xy" }).notNull(), // Returns {x: lng, y: lat}
    radiusMeters: decimal("radius_meters", {
      precision: 8,
      scale: 2,
    }).notNull(),
    areaSqMeters: decimal("area_sq_meters", {
      precision: 12,
      scale: 2,
    }).notNull(),
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (table) => [
    index("unlocked_areas_user_id_idx").on(table.userId),
    // FIXED: Use spatial index for point column instead of btree
    index("unlocked_areas_center_point_idx").using("gist", table.centerPoint),
    index("unlocked_areas_unlocked_at_idx").on(table.unlockedAt),
  ]
);

export type LocationPoint = typeof locationPoints.$inferSelect;
export type NewLocationPoint = typeof locationPoints.$inferInsert;
export type UnlockedArea = typeof unlockedAreas.$inferSelect;
export type NewUnlockedArea = typeof unlockedAreas.$inferInsert;
