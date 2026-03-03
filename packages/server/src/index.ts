import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { itemsRoutes, currenciesRoutes } from "./routes/items";
import { listingsRoutes } from "./routes/listings";
import { usersRoutes } from "./routes/users";
import { reportsRoutes } from "./routes/reports";
import { adminRoutes } from "./routes/admin";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/rbac";
import { eq } from "drizzle-orm";
import { db } from "./db/db";
import { userProfilesTable, usersActivityTable } from "./db/schemas";
import { userRolesTable } from "./db/rbac-schema";

const app = new Elysia()
  .use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:4173"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  )
  .get("/", () => "OpenMarket API")
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authMiddleware)
  .get("/api/auth/get-session", async ({ session }) => {
    if (session.user) {
      // Check if user profile exists — only create if missing
      const [existing] = await db
        .select({ userId: userProfilesTable.userId })
        .from(userProfilesTable)
        .where(eq(userProfilesTable.userId, session.user.id));

      if (!existing) {
        await Promise.all([
          db
            .insert(userProfilesTable)
            .values({
              userId: session.user.id,
              username: session.user.name,
            })
            .onConflictDoNothing(),
          db
            .insert(usersActivityTable)
            .values({
              user_id: session.user.id,
              is_active: true,
              last_activity_at: new Date(),
            })
            .onConflictDoNothing(),
          db
            .insert(userRolesTable)
            .values({
              userId: session.user.id,
              roleId: "user",
            })
            .onConflictDoNothing(),
        ]);
      }
    }
    return session;
  })
  // Global ban guard — blocks all write, update, delete operations for banned users
  .onBeforeHandle(({ session, set, request }) => {
    if (
      request.method !== "GET" &&
      !new URL(request.url).pathname.startsWith("/api/auth") &&
      session?.user &&
      session?.ban
    ) {
      set.status = 403;
      return {
        success: false,
        error: "You are banned from performing this action",
        ban: session.ban,
      };
    }
  })
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  .use(itemsRoutes)
  .use(currenciesRoutes)
  .use(listingsRoutes)
  .use(usersRoutes)
  .use(reportsRoutes)
  .use(adminRoutes)
  .listen(process.env.API_PORT || 3000);

console.log(
  `Server running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
