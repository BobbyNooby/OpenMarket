import { Elysia } from "elysia";
import { conversationRoutes } from "./conversations";
import { chatRoutes } from "./chat";

export const messagesRoutes = new Elysia({ prefix: "/api" })
  .use(conversationRoutes)
  .use(chatRoutes);
