import { Elysia } from "elysia";
import { conversationRoutes } from "./conversations";
import { chatRoutes } from "./chat";

export const messagesRoutes = new Elysia({ prefix: "/api", detail: { tags: ["Messages"] } })
  .use(conversationRoutes)
  .use(chatRoutes);
