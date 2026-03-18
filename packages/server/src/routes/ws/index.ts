import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/rbac";
import { db } from "../../db/db";
import { conversationParticipantsTable } from "../../db/schemas";
import { and, eq, ne } from "drizzle-orm";
import {
  createTicket,
  validateTicket,
  addConnection,
  removeConnection,
  sendToUser,
} from "./connection-manager";
import type { WsMessageIn } from "./types";

export const wsRoutes = new Elysia()
  // REST endpoint to get a WS ticket (requires auth via cookies)
  .use(authMiddleware)
  .post("/api/ws/ticket", ({ session, set }) => {
    if (!session.user) {
      set.status = 401;
      return { success: false, error: "Unauthorized" };
    }
    const ticket = createTicket(session.user.id);
    return { success: true, ticket };
  })

  // WebSocket endpoint
  .ws("/ws/chat", {
    query: t.Object({
      ticket: t.String(),
    }),

    open(ws) {
      const ticket = ws.data.query.ticket;
      const userId = validateTicket(ticket);

      if (!userId) {
        ws.close(4001, "Invalid or expired ticket");
        return;
      }

      // Store userId on the ws data for later use
      (ws.data as { userId?: string }).userId = userId;
      addConnection(userId, ws);
      console.log(`\x1b[35mWS\x1b[0m      \x1b[32mconnected\x1b[0m \x1b[90m[${userId}]\x1b[0m`);
    },

    async message(ws, msg) {
      const userId = (ws.data as { userId?: string }).userId;
      if (!userId) return;

      let parsed: WsMessageIn;
      try {
        parsed = typeof msg === "string" ? JSON.parse(msg) : msg as WsMessageIn;
      } catch {
        return;
      }

      if (parsed.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      if (parsed.type === "typing" || parsed.type === "stop_typing") {
        const convId = parsed.data.conversation_id;

        // Verify user is in this conversation
        const [participation] = await db
          .select()
          .from(conversationParticipantsTable)
          .where(
            and(
              eq(conversationParticipantsTable.conversation_id, convId),
              eq(conversationParticipantsTable.user_id, userId),
            ),
          );

        if (!participation) return;

        // Get other participants and forward the typing event
        const others = await db
          .select({ user_id: conversationParticipantsTable.user_id })
          .from(conversationParticipantsTable)
          .where(
            and(
              eq(conversationParticipantsTable.conversation_id, convId),
              ne(conversationParticipantsTable.user_id, userId),
            ),
          );

        const payload = {
          type: parsed.type as "typing" | "stop_typing",
          data: { conversation_id: convId, user_id: userId },
        };

        for (const other of others) {
          sendToUser(other.user_id, payload);
        }
      }
    },

    close(ws) {
      const userId = (ws.data as { userId?: string }).userId;
      if (userId) {
        removeConnection(userId, ws);
        console.log(`\x1b[35mWS\x1b[0m      \x1b[31mdisconnected\x1b[0m \x1b[90m[${userId}]\x1b[0m`);
      }
    },
  });
