import { relations } from "drizzle-orm";
import { exploredAreas } from "./exploredAreas";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  exploredAreas: many(exploredAreas),
}));

export const exploredAreasRelations = relations(exploredAreas, ({ one }) => ({
  user: one(users, {
    fields: [exploredAreas.userID],
    references: [users.id],
  }),
}));
