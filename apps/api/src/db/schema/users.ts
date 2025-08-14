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
    username: varchar("username", { length: 100 }).notNull().unique(), // 3-word generated name
    deviceFingerprint: text("device_fingerprint").notNull().unique(),
    totalDistance: decimal("total_distance", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    totalAreaUnlocked: decimal("total_area_unlocked", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastActive: timestamp("last_active").defaultNow().notNull(),
  },
  (table) => [
    index("users_device_fingerprint_idx").on(table.deviceFingerprint),
    index("users_username_idx").on(table.username),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
