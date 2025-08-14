import {
  boolean,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    totalAreaUnlocked: decimal("total_area_unlocked", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("groups_name_idx").on(table.name),
    index("groups_created_by_idx").on(table.createdBy),
  ]
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupID: uuid("group_id")
      .references(() => groups.id)
      .notNull(),
    userID: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    contribution: decimal("contribution", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
  },
  (table) => [
    index("group_members_group_id_idx").on(table.groupID),
    index("group_members_user_id_idx").on(table.userID),
  ]
);

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
