// schema/users.ts
import {
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 100 }).unique().notNull(),
    deviceFingerprint: text("device_fingerprint").unique().notNull(),
    // Current location (updated in real-time)
    currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }),
    currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
    currentHexRes8: varchar("current_hex_res8", { length: 16 }),
    lastLocationUpdate: timestamp("last_location_update"),
    // Optional: keep traditional distance if needed for display
    estimatedDistance: decimal("estimated_distance", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(), // meters
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastActive: timestamp("last_active").defaultNow().notNull(),
  },
  (table) => [
    index("users_device_fingerprint_idx").on(table.deviceFingerprint),
    index("users_username_idx").on(table.username),
    index("users_current_hex_idx").on(table.currentHexRes8),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
