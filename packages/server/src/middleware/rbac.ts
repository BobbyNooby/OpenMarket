import { Elysia } from "elysia";
import { eq, and } from "drizzle-orm";
import { db } from "../db/db";
import { auth } from "../auth";
import {
  userRolesTable,
  rolePermissionsTable,
  userBansTable,
} from "../db/rbac-schema";

export async function getUserPermissions(userId: string): Promise<string[]> {
  const results = await db
    .select({ permissionId: rolePermissionsTable.permissionId })
    .from(userRolesTable)
    .innerJoin(rolePermissionsTable, eq(userRolesTable.roleId, rolePermissionsTable.roleId))
    .where(eq(userRolesTable.userId, userId));

  return results.map((r) => r.permissionId);
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const results = await db
    .select({ roleId: userRolesTable.roleId })
    .from(userRolesTable)
    .where(eq(userRolesTable.userId, userId));

  return results.map((r) => r.roleId);
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const ban = await db
    .select()
    .from(userBansTable)
    .where(eq(userBansTable.userId, userId))
    .limit(1);

  if (ban.length === 0) return false;

  const activeBan = ban[0];
  if (activeBan.expiresAt && activeBan.expiresAt < new Date()) {
    return false;
  }

  return true;
}

export async function assignRole(userId: string, roleId: string) {
  await db
    .insert(userRolesTable)
    .values({ userId, roleId })
    .onConflictDoNothing();
}

export async function removeRole(userId: string, roleId: string) {
  await db
    .delete(userRolesTable)
    .where(and(eq(userRolesTable.userId, userId), eq(userRolesTable.roleId, roleId)));
}

export type AuthSession = {
  user: { id: string; name: string; email: string; image?: string | null } | null;
  permissions: string[];
  roles: string[];
};

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .derive({ as: "global" }, async ({ request }) => {
    const betterAuthSession = await auth.api.getSession({ headers: request.headers });

    if (!betterAuthSession?.user) {
      return {
        session: { user: null, permissions: [], roles: [] } as AuthSession,
      };
    }

    const userId = betterAuthSession.user.id;
    const banned = await isUserBanned(userId);

    if (banned) {
      return {
        session: { user: null, permissions: [], roles: [] } as AuthSession,
      };
    }

    const [permissions, roles] = await Promise.all([
      getUserPermissions(userId),
      getUserRoles(userId),
    ]);

    return {
      session: {
        user: {
          id: userId,
          name: betterAuthSession.user.name,
          email: betterAuthSession.user.email,
          image: betterAuthSession.user.image,
        },
        permissions,
        roles,
      } as AuthSession,
    };
  });

export function requireAuth() {
  return new Elysia({ name: "require-auth" })
    .use(authMiddleware)
    .onBeforeHandle(({ session, set }) => {
      if (!session?.user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
    });
}

export function requirePermission(permission: string) {
  return new Elysia({ name: `require-permission-${permission}` })
    .use(authMiddleware)
    .onBeforeHandle(({ session, set }) => {
      if (!session?.user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      if (!session.permissions.includes(permission)) {
        set.status = 403;
        return { error: "Forbidden" };
      }
    });
}

export function requireRole(role: string) {
  return new Elysia({ name: `require-role-${role}` })
    .use(authMiddleware)
    .onBeforeHandle(({ session, set }) => {
      if (!session?.user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      if (!session.roles.includes(role)) {
        set.status = 403;
        return { error: "Forbidden" };
      }
    });
}
