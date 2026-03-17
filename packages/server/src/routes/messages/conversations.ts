import { Elysia, t } from "elysia";
import { db } from "../../db/db";
import {
  conversationsTable,
  conversationParticipantsTable,
  messagesTable,
  userProfilesTable,
} from "../../db/schemas";
import { user as userTable } from "../../db/auth-schema";
import { and, eq, inArray, ne, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../../middleware/rbac";

export const conversationRoutes = new Elysia()
  .use(authMiddleware)

  // POST /conversations — create or return existing conversation for this user pair + listing
  .post(
    "/conversations",
    async ({ body, session, set }) => {
      if (!session.user) { set.status = 401; return { success: false, error: "Unauthorized" }; }

      const { target_user_id, listing_id } = body;

      if (target_user_id === session.user.id) {
        set.status = 400;
        return { success: false, error: "Cannot start a conversation with yourself" };
      }

      // Check if conversation already exists for this user pair + listing
      const myParticipations = await db
        .select({ conversation_id: conversationParticipantsTable.conversation_id })
        .from(conversationParticipantsTable)
        .where(eq(conversationParticipantsTable.user_id, session.user.id));

      const myConvIds = myParticipations.map((p) => p.conversation_id);

      if (myConvIds.length > 0) {
        const sharedConvs = await db
          .select({ conversation_id: conversationParticipantsTable.conversation_id })
          .from(conversationParticipantsTable)
          .where(
            and(
              inArray(conversationParticipantsTable.conversation_id, myConvIds),
              eq(conversationParticipantsTable.user_id, target_user_id),
            ),
          );

        const sharedConvIds = sharedConvs.map((p) => p.conversation_id);

        if (sharedConvIds.length > 0) {
          const [existing] = await db
            .select()
            .from(conversationsTable)
            .where(
              and(
                inArray(conversationsTable.id, sharedConvIds),
                listing_id
                  ? eq(conversationsTable.listing_id, listing_id)
                  : sql`${conversationsTable.listing_id} IS NULL`,
              ),
            )
            .limit(1);

          if (existing) return { success: true, data: existing, existing: true };
        }
      }

      // Create new conversation + add both participants
      const [conversation] = await db
        .insert(conversationsTable)
        .values({ listing_id: listing_id ?? null })
        .returning();

      await db.insert(conversationParticipantsTable).values([
        { conversation_id: conversation.id, user_id: session.user.id },
        { conversation_id: conversation.id, user_id: target_user_id },
      ]);

      return { success: true, data: conversation, existing: false };
    },
    {
      body: t.Object({
        target_user_id: t.String(),
        listing_id: t.Optional(t.String()),
      }),
    },
  )

  // GET /conversations — list authenticated user's conversations with previews + unread counts
  .get("/conversations", async ({ session, set }) => {
    if (!session.user) { set.status = 401; return { success: false, error: "Unauthorized" }; }

    // 1. Get user's participations (includes their last_read_at per conversation)
    const myParticipations = await db
      .select({
        conversation_id: conversationParticipantsTable.conversation_id,
        last_read_at: conversationParticipantsTable.last_read_at,
      })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.user_id, session.user.id));

    if (myParticipations.length === 0) return { success: true, data: [] };

    const convIds = myParticipations.map((p) => p.conversation_id);
    const lastReadMap = new Map(myParticipations.map((p) => [p.conversation_id, p.last_read_at]));

    // 2. Fetch conversations ordered by most recent activity
    const conversations = await db
      .select()
      .from(conversationsTable)
      .where(inArray(conversationsTable.id, convIds))
      .orderBy(desc(conversationsTable.updated_at));

    // 3. Batch: fetch other participants with their profile info
    const otherParticipants = await db
      .select({
        conversation_id: conversationParticipantsTable.conversation_id,
        user_id: conversationParticipantsTable.user_id,
        username: userProfilesTable.username,
        name: userTable.name,
        image: userTable.image,
      })
      .from(conversationParticipantsTable)
      .innerJoin(userProfilesTable, eq(conversationParticipantsTable.user_id, userProfilesTable.userId))
      .innerJoin(userTable, eq(conversationParticipantsTable.user_id, userTable.id))
      .where(
        and(
          inArray(conversationParticipantsTable.conversation_id, convIds),
          ne(conversationParticipantsTable.user_id, session.user.id),
        ),
      );

    const participantMap = new Map(otherParticipants.map((p) => [p.conversation_id, p]));

    // 4. Batch: fetch all non-deleted messages for these conversations (for preview + unread)
    const allMessages = await db
      .select()
      .from(messagesTable)
      .where(
        and(
          inArray(messagesTable.conversation_id, convIds),
          eq(messagesTable.is_deleted, false),
        ),
      )
      .orderBy(desc(messagesTable.created_at));

    const messagesByConv = new Map<string, typeof allMessages>();
    for (const msg of allMessages) {
      if (!messagesByConv.has(msg.conversation_id)) {
        messagesByConv.set(msg.conversation_id, []);
      }
      messagesByConv.get(msg.conversation_id)!.push(msg);
    }

    // 5. Build response
    const data = conversations.map((conv) => {
      const other = participantMap.get(conv.id);
      const messages = messagesByConv.get(conv.id) ?? [];
      const lastMessage = messages[0] ?? null;
      const lastReadAt = lastReadMap.get(conv.id) ?? null;

      const unreadCount = messages.filter(
        (m) =>
          m.sender_id !== session.user!.id &&
          (lastReadAt === null || m.created_at > lastReadAt),
      ).length;

      return {
        id: conv.id,
        created_at: conv.created_at.toISOString(),
        updated_at: conv.updated_at.toISOString(),
        listing_id: conv.listing_id,
        other_participant: other
          ? { user_id: other.user_id, username: other.username, display_name: other.name, avatar: other.image }
          : null,
        last_message: lastMessage
          ? { id: lastMessage.id, content: lastMessage.content, sender_id: lastMessage.sender_id, created_at: lastMessage.created_at.toISOString() }
          : null,
        unread_count: unreadCount,
      };
    });

    return { success: true, data };
  });
