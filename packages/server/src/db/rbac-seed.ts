import { db } from "./db";
import { rolesTable, permissionsTable, rolePermissionsTable } from "./rbac-schema";

const permissions = [
  // Listings
  { id: "listing:read", name: "listing:read", description: "View listings" },
  { id: "listing:create", name: "listing:create", description: "Create listings" },
  { id: "listing:update", name: "listing:update", description: "Update own listings" },
  { id: "listing:delete", name: "listing:delete", description: "Delete own listings" },
  { id: "listing:moderate", name: "listing:moderate", description: "Moderate any listing" },

  // Reviews
  { id: "review:read", name: "review:read", description: "View reviews" },
  { id: "review:create", name: "review:create", description: "Create reviews" },
  { id: "review:update", name: "review:update", description: "Update own reviews" },
  { id: "review:delete", name: "review:delete", description: "Delete own reviews" },
  { id: "review:moderate", name: "review:moderate", description: "Moderate any review" },

  // Items
  { id: "item:read", name: "item:read", description: "View items" },
  { id: "item:create", name: "item:create", description: "Create items" },
  { id: "item:update", name: "item:update", description: "Update items" },
  { id: "item:delete", name: "item:delete", description: "Delete items" },

  // Currencies
  { id: "currency:read", name: "currency:read", description: "View currencies" },
  { id: "currency:create", name: "currency:create", description: "Create currencies" },
  { id: "currency:update", name: "currency:update", description: "Update currencies" },
  { id: "currency:delete", name: "currency:delete", description: "Delete currencies" },

  // Profile
  { id: "profile:read", name: "profile:read", description: "View profiles" },
  { id: "profile:update", name: "profile:update", description: "Update own profile" },

  // Moderation
  { id: "user:ban", name: "user:ban", description: "Ban users" },
  { id: "user:unban", name: "user:unban", description: "Unban users" },
  { id: "user:warn", name: "user:warn", description: "Warn users" },
  { id: "user:delete", name: "user:delete", description: "Delete users permanently" },

  // Reports
  { id: "report:create", name: "report:create", description: "Submit reports" },
  { id: "report:moderate", name: "report:moderate", description: "Moderate reports" },

  // Admin
  { id: "admin:users", name: "admin:users", description: "Manage all users" },
  { id: "admin:roles", name: "admin:roles", description: "Manage roles" },

  // Audit
  { id: "audit:read", name: "audit:read", description: "View audit logs" },

  // Messaging
  { id: "messages:send", name: "messages:send", description: "Send messages" },
  { id: "messages:read", name: "messages:read", description: "Read messages" },
  { id: "messages:delete", name: "messages:delete", description: "Delete own messages" },
  { id: "messages:moderate", name: "messages:moderate", description: "Moderate any message" },
];

const roles = [
  { id: "user", name: "user", description: "Default logged-in user" },
  { id: "moderator", name: "moderator", description: "Can moderate content and users" },
  { id: "database-maintainer", name: "database-maintainer", description: "Can manage items and currencies" },
  { id: "admin", name: "admin", description: "Full access" },
];

const rolePermissionMap: Record<string, string[]> = {
  user: [
    "listing:read", "listing:create", "listing:update", "listing:delete",
    "review:read", "review:create", "review:update", "review:delete",
    "item:read", "currency:read",
    "profile:read", "profile:update",
    "report:create",
    "messages:send", "messages:read", "messages:delete",
  ],
  moderator: [
    "listing:read", "listing:create", "listing:update", "listing:delete", "listing:moderate",
    "review:read", "review:create", "review:update", "review:delete", "review:moderate",
    "item:read", "currency:read",
    "profile:read", "profile:update",
    "user:ban", "user:unban", "user:warn",
    "report:create", "report:moderate",
    "messages:send", "messages:read", "messages:delete", "messages:moderate",
  ],
  "database-maintainer": [
    "listing:read", "listing:create", "listing:update", "listing:delete",
    "review:read", "review:create", "review:update", "review:delete",
    "item:read", "item:create", "item:update", "item:delete",
    "currency:read", "currency:create", "currency:update", "currency:delete",
    "profile:read", "profile:update",
  ],
  admin: permissions.map((p) => p.id),
};

export async function seedRbac() {
  console.log("Seeding RBAC...");

  // Insert permissions
  for (const perm of permissions) {
    await db
      .insert(permissionsTable)
      .values(perm)
      .onConflictDoNothing();
  }
  console.log(`Inserted ${permissions.length} permissions`);

  // Insert roles
  for (const role of roles) {
    await db
      .insert(rolesTable)
      .values(role)
      .onConflictDoNothing();
  }
  console.log(`Inserted ${roles.length} roles`);

  // Insert role-permission mappings
  for (const [roleId, permIds] of Object.entries(rolePermissionMap)) {
    for (const permissionId of permIds) {
      await db
        .insert(rolePermissionsTable)
        .values({ roleId, permissionId })
        .onConflictDoNothing();
    }
  }
  console.log("Inserted role-permission mappings");

  console.log("RBAC seed complete!");
}

// Run if called directly
if (import.meta.main) {
  seedRbac().then(() => process.exit(0));
}
