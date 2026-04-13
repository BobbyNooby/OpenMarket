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
import { analyticsRoutes } from "./routes/analytics";
import { watchlistRoutes } from "./routes/watchlist";
import { listsRoutes } from "./routes/lists";
import { uploadsRoutes } from "./routes/uploads";
import { adminRoutes } from "./routes/admin";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/rbac";
import { eq } from "drizzle-orm";
import { db } from "./db/db";
import { userProfilesTable, usersActivityTable } from "./db/schemas";
import { userRolesTable } from "./db/rbac-schema";
import { startExpiryJob } from "./jobs/expiry";
import { loadSiteConfig, getSiteConfig, getSiteTheme, getSiteAssets } from "./services/site-config";

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
      origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
        : ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  )
  .get("/", () => "OpenMarket API")
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  // Public site config + theme — served on every page load by the SvelteKit root layout
  .get("/site-config/public", () => ({
    success: true,
    data: { config: getSiteConfig(), theme: getSiteTheme(), assets: getSiteAssets() },
  }))
  .use(authMiddleware)
  .get("/api/auth/get-session", async ({ session }) => {
    if (!session.user) return session;

    // Check if the user has completed onboarding (has a marketplace profile)
    const [existing] = await db
      .select({ userId: userProfilesTable.userId, language: userProfilesTable.language, avatar_url: userProfilesTable.avatar_url })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, session.user.id));

    // Prefer the custom avatar over the Discord CDN image
    const avatarUrl = existing?.avatar_url || session.user.image;
    return { ...session, user: { ...session.user, image: avatarUrl }, hasProfile: !!existing, language: existing?.language ?? null };
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
  .use(analyticsRoutes)
  .use(watchlistRoutes)
  .use(listsRoutes)
  .use(uploadsRoutes)
  .use(adminRoutes)
  .listen(process.env.API_PORT || 3000);

console.log(
  `Server running at http://${app.server?.hostname}:${app.server?.port}`,
);

startExpiryJob();
loadSiteConfig().catch((err) => console.error('Failed to load site config:', err));

export type App = typeof app;
