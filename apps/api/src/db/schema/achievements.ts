import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  requirement: text("requirement").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userID: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    achievementID: uuid("achievement_id")
      .references(() => achievements.id)
      .notNull(),
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_achievements_user_id_idx").on(table.userID),
    index("user_achievements_achievement_id_idx").on(table.achievementID),
  ]
);

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
