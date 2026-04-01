import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { itemsRoutes, currenciesRoutes } from "./routes/items";
import { listingsRoutes } from "./routes/listings/index";
import { categoriesRoutes } from "./routes/categories";
import { messagesRoutes } from "./routes/messages/index";
import { wsRoutes } from "./routes/ws/index";
import { usersRoutes } from "./routes/users";
import { reportsRoutes } from "./routes/reports";
import { notificationsRoutes } from "./routes/notifications";
import { adminRoutes } from "./routes/admin";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/rbac";
import { eq } from "drizzle-orm";
import { db } from "./db/db";
import { userProfilesTable, usersActivityTable } from "./db/schemas";
import { userRolesTable } from "./db/rbac-schema";
import { startExpiryJob } from "./jobs/expiry";

const methodColors: Record<string, string> = {
  GET: "\x1b[32m",     // green
  POST: "\x1b[34m",    // blue
  PUT: "\x1b[33m",     // yellow
  PATCH: "\x1b[33m",   // yellow
  DELETE: "\x1b[31m",  // red
  OPTIONS: "\x1b[90m", // gray
};
const reset = "\x1b[0m";
const dim = "\x1b[90m";

const app = new Elysia()
  .derive(({ request }) => {
    return { startTime: performance.now(), ip: request.headers.get("x-forwarded-for") || "local" };
  })
  .onAfterResponse(({ request, startTime, ip, set }) => {
    const ms = (performance.now() - startTime).toFixed(1);
    const url = new URL(request.url);
    const method = request.method;
    const color = methodColors[method] || reset;
    const status = Number(set.status) || 200;
    const statusColor = status >= 400 ? "\x1b[31m" : status >= 300 ? "\x1b[36m" : "\x1b[32m";
    console.log(
      `${color}${method.padEnd(7)}${reset} ${url.pathname}${dim}${url.search || ""}${reset} ${statusColor}${status}${reset} ${dim}${ms}ms${reset} ${dim}[${ip}]${reset}`
    );
  })
  .onError(({ request, error, startTime, ip }) => {
    const ms = startTime ? (performance.now() - startTime).toFixed(1) : "?";
    const url = new URL(request.url);
    const msg = "message" in error ? error.message : String(error);
    console.error(
      `\x1b[31mERROR${reset}   ${url.pathname} \x1b[31m${msg}${reset} ${dim}${ms}ms${reset} ${dim}[${ip}]${reset}`
    );
  })
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
  .use(categoriesRoutes)
  .use(listingsRoutes)
  .use(usersRoutes)
  .use(reportsRoutes)
  .use(notificationsRoutes)
  .use(messagesRoutes)
  .use(wsRoutes)
  .use(adminRoutes)
  .listen(process.env.API_PORT || 3000);

console.log(
  `Server running at http://${app.server?.hostname}:${app.server?.port}`,
);

startExpiryJob();

export type App = typeof app;
