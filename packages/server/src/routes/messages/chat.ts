import { Elysia, t } from "elysia";
import { db } from "../../db/db";
import {
  conversationsTable,
  conversationParticipantsTable,
  messagesTable,
  userProfilesTable,
} from "../../db/schemas";
import { user as userTable } from "../../db/auth-schema";
import { and, eq, lt, desc } from "drizzle-orm";
import { authMiddleware } from "../../middleware/rbac";

export const chatRoutes = new Elysia()
  .use(authMiddleware)

  // GET /conversations/:id/messages — cursor-based pagination, marks conversation as read
  .get(
    "/conversations/:id/messages",
    async ({ params, query, session, set }) => {
      if (!session.user) { set.status = 401; return { success: false, error: "Unauthorized" }; }

      const [participation] = await db
        .select()
        .from(conversationParticipantsTable)
        .where(
          and(
            eq(conversationParticipantsTable.conversation_id, params.id),
            eq(conversationParticipantsTable.user_id, session.user.id),
          ),
        );

      if (!participation) {
        set.status = 403;
        return { success: false, error: "Not a participant in this conversation" };
      }

      const limit = Math.min(Number(query.limit ?? 50), 100);

      // Resolve cursor: get created_at of the `before` message ID, query backwards from there
      let cursorCondition = undefined;
      if (query.before) {
        const [cursor] = await db
          .select({ created_at: messagesTable.created_at })
          .from(messagesTable)
          .where(eq(messagesTable.id, query.before));
        if (cursor) cursorCondition = lt(messagesTable.created_at, cursor.created_at);
      }

      const messages = await db
        .select({
          id: messagesTable.id,
          conversation_id: messagesTable.conversation_id,
          sender_id: messagesTable.sender_id,
          content: messagesTable.content,
          created_at: messagesTable.created_at,
          edited_at: messagesTable.edited_at,
          is_deleted: messagesTable.is_deleted,
          sender_username: userProfilesTable.username,
          sender_name: userTable.name,
          sender_image: userTable.image,
        })
        .from(messagesTable)
        .innerJoin(userProfilesTable, eq(messagesTable.sender_id, userProfilesTable.userId))
        .innerJoin(userTable, eq(messagesTable.sender_id, userTable.id))
        .where(and(eq(messagesTable.conversation_id, params.id), cursorCondition))
        .orderBy(desc(messagesTable.created_at))
        .limit(limit + 1);

      const hasMore = messages.length > limit;
      const page = messages.slice(0, limit);

      // Mark as read
      await db
        .update(conversationParticipantsTable)
        .set({ last_read_at: new Date() })
        .where(
          and(
            eq(conversationParticipantsTable.conversation_id, params.id),
            eq(conversationParticipantsTable.user_id, session.user.id),
          ),
        );

      return {
        success: true,
        data: page.map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          content: m.is_deleted ? null : m.content,
          created_at: m.created_at.toISOString(),
          edited_at: m.edited_at?.toISOString() ?? null,
          is_deleted: m.is_deleted,
          sender: {
            user_id: m.sender_id,
            username: m.sender_username,
            display_name: m.sender_name,
            avatar: m.sender_image,
          },
        })),
        has_more: hasMore,
        next_cursor: hasMore ? page[page.length - 1].id : null,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        before: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // POST /conversations/:id/messages — send a message
  .post(
    "/conversations/:id/messages",
    async ({ params, body, session, set }) => {
      if (!session.user) { set.status = 401; return { success: false, error: "Unauthorized" }; }
      if (session.ban) { set.status = 403; return { success: false, error: "You are banned from sending messages" }; }

      const [participation] = await db
        .select()
        .from(conversationParticipantsTable)
        .where(
          and(
            eq(conversationParticipantsTable.conversation_id, params.id),
            eq(conversationParticipantsTable.user_id, session.user.id),
          ),
        );

      if (!participation) {
        set.status = 403;
        return { success: false, error: "Not a participant in this conversation" };
      }

      if (!body.content.trim()) {
        set.status = 400;
        return { success: false, error: "Message content cannot be empty" };
      }

      const now = new Date();
      const [[message]] = await Promise.all([
        db
          .insert(messagesTable)
          .values({ conversation_id: params.id, sender_id: session.user.id, content: body.content.trim(), created_at: now })
          .returning(),
        db
          .update(conversationsTable)
          .set({ updated_at: now })
          .where(eq(conversationsTable.id, params.id)),
      ]);

      return {
        success: true,
        data: {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          content: message.content,
          created_at: message.created_at.toISOString(),
          edited_at: null,
          is_deleted: false,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ content: t.String() }),
    },
  )

  // DELETE /messages/:id — soft delete (sender or moderator)
  .delete(
    "/messages/:id",
    async ({ params, session, set }) => {
      if (!session.user) { set.status = 401; return { success: false, error: "Unauthorized" }; }

      const [message] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.id, params.id));

      if (!message) { set.status = 404; return { success: false, error: "Message not found" }; }

      const isSender = message.sender_id === session.user.id;
      const isModerator = session.permissions?.includes("messages:moderate") ?? false;

      if (!isSender && !isModerator) {
        set.status = 403;
        return { success: false, error: "Cannot delete another user's message" };
      }

      await db.update(messagesTable).set({ is_deleted: true }).where(eq(messagesTable.id, params.id));

      return { success: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
