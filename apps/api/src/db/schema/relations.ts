import { relations } from "drizzle-orm";
import { achievements, userAchievements } from "./achievements";
import { groupMembers, groups } from "./groups";
import { locationPoints, unlockedAreas } from "./locations";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  locationPoints: many(locationPoints),
  unlockedAreas: many(unlockedAreas),
  groupMemberships: many(groupMembers),
  achievements: many(userAchievements),
  createdGroups: many(groups),
}));

export const locationPointsRelations = relations(locationPoints, ({ one }) => ({
  user: one(users, {
    fields: [locationPoints.userID],
    references: [users.id],
  }),
}));

export const unlockedAreasRelations = relations(unlockedAreas, ({ one }) => ({
  user: one(users, {
    fields: [unlockedAreas.userId],
    references: [users.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupID],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userID],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    user: one(users, {
      fields: [userAchievements.userID],
      references: [users.id],
    }),
    achievement: one(achievements, {
      fields: [userAchievements.achievementID],
      references: [achievements.id],
    }),
  })
);
