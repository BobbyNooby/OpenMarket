import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { itemsRoutes, currenciesRoutes } from "./routes/items";
import { listingsRoutes } from "./routes/listings";
import { usersRoutes } from "./routes/users";
import { adminRoutes } from "./routes/admin";
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
  .use(itemsRoutes)
  .use(currenciesRoutes)
  .use(listingsRoutes)
  .use(usersRoutes)
  .use(adminRoutes)
  .listen(process.env.API_PORT || 3000);

console.log(
  `Server running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
