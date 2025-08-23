import {
  decimal,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const exploredAreas = pgTable(
  "explored_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userID: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    hexIndex: varchar("hex_index", { length: 16 }).notNull(), // H3 index at resolution 9
    visitedAt: timestamp("visited_at").defaultNow().notNull(),
    explorationMethod: varchar("exploration_method", { length: 20 }).notNull(),
    speed: decimal("speed", { precision: 5, scale: 2 }).notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    timeSpent: decimal("time_spent", { precision: 8, scale: 2 })
      .default("0")
      .notNull(),
  },
  (table) => [
    index("explored_areas_user_id_idx").on(table.userID),
    index("explored_areas_hex_idx").on(table.hexIndex),
    index("explored_areas_user_hex_idx").on(table.userID, table.hexIndex),
    index("explored_areas_visited_at_idx").on(table.visitedAt),
    index("explored_areas_method_idx").on(table.explorationMethod),
  ]
);

export type ExploredArea = typeof exploredAreas.$inferSelect;
export type NewExploredArea = typeof exploredAreas.$inferInsert;
