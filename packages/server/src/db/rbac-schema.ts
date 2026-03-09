import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const rolesTable = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const permissionsTable = pgTable("permissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const rolePermissionsTable = pgTable("role_permissions", {
  roleId: text("role_id")
    .notNull()
    .references(() => rolesTable.id, { onDelete: "cascade" }),
  permissionId: text("permission_id")
    .notNull()
    .references(() => permissionsTable.id, { onDelete: "cascade" }),
});

export const userRolesTable = pgTable("user_roles", {
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  roleId: text("role_id")
    .notNull()
    .references(() => rolesTable.id, { onDelete: "cascade" }),
});

export const userBansTable = pgTable("user_bans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  bannedBy: text("banned_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reason: text("reason"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const userWarningsTable = pgTable("user_warnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  warnedBy: text("warned_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g. "user.ban", "role.assign", "report.resolve"
  targetType: text("target_type").notNull(), // "user", "role", "report", "listing"
  targetId: text("target_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_created_at_idx").on(table.createdAt.desc()),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_actor_id_idx").on(table.actorId),
]);

// Type exports
export type Role = typeof rolesTable.$inferSelect;
export type Permission = typeof permissionsTable.$inferSelect;
export type UserRole = typeof userRolesTable.$inferSelect;
export type UserBan = typeof userBansTable.$inferSelect;
export type UserWarning = typeof userWarningsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
