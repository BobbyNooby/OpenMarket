import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { itemsRoutes, currenciesRoutes } from "./routes/items";
import { listingsRoutes } from "./routes/listings";
import { usersRoutes } from "./routes/users";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/rbac";

const app = new Elysia()
  .use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:4173"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  )
  .get("/", () => "OpenMarket API")
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authMiddleware)
  .get("/api/auth/get-session", ({ session }) => session)
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  // RBAC role management endpoints (for testing/demo purposes)
  .get("/giveRole/:role/:userId", async ({ params }) => {
    const { assignRole } = await import("./middleware/rbac");
    await assignRole(params.userId, params.role);
    console.log(
      `[giveRole] Assigned role "${params.role}" to user "${params.userId}"`,
    );
    return { success: true, role: params.role, userId: params.userId };
  })
  .get("/removeRole/:role/:userId", async ({ params }) => {
    const { removeRole } = await import("./middleware/rbac");
    await removeRole(params.userId, params.role);
    console.log(
      `[removeRole] Removed role "${params.role}" from user "${params.userId}"`,
    );
    return { success: true, role: params.role, userId: params.userId };
  })
  .use(itemsRoutes)
  .use(currenciesRoutes)
  .use(listingsRoutes)
  .use(usersRoutes)
  .listen(process.env.API_PORT || 3000);

console.log(
  `Server running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
