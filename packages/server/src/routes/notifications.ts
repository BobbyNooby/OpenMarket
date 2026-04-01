import { Elysia, t } from "elysia";
import { db } from "../db/db";
import { notificationsTable } from "../db/schemas";
import { eq, and, desc, count } from "drizzle-orm";
import { authMiddleware } from "../middleware/rbac";

export const notificationsRoutes = new Elysia({ prefix: "/notifications" })
  .use(authMiddleware)

  // GET /notifications — paginated, newest first, includes unread count
  .get(
    "/",
    async ({ query, session, set }) => {
      if (!session.user) {
        set.status = 401;
        return { success: false, error: "Unauthorized" };
      }

      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = Number(query.offset) || 0;

      const [notifications, [unreadResult]] = await Promise.all([
        db
          .select()
          .from(notificationsTable)
          .where(eq(notificationsTable.user_id, session.user.id))
          .orderBy(desc(notificationsTable.created_at))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(notificationsTable)
          .where(
            and(
              eq(notificationsTable.user_id, session.user.id),
              eq(notificationsTable.is_read, false),
            ),
          ),
      ]);

      return {
        success: true,
        data: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          is_read: n.is_read,
          created_at: n.created_at.toISOString(),
        })),
        unread_count: unreadResult.count,
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    },
  )

  // PATCH /notifications/:id/read — mark single as read
  .patch(
    "/:id/read",
    async ({ params, session, set }) => {
      if (!session.user) {
        set.status = 401;
        return { success: false, error: "Unauthorized" };
      }

      const [updated] = await db
        .update(notificationsTable)
        .set({ is_read: true })
        .where(
          and(
            eq(notificationsTable.id, params.id),
            eq(notificationsTable.user_id, session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        set.status = 404;
        return { success: false, error: "Notification not found" };
      }

      return { success: true };
    },
    { params: t.Object({ id: t.String() }) },
  )

  // POST /notifications/read-all — mark all as read
  .post("/read-all", async ({ session, set }) => {
    if (!session.user) {
      set.status = 401;
      return { success: false, error: "Unauthorized" };
    }

    await db
      .update(notificationsTable)
      .set({ is_read: true })
      .where(
        and(
          eq(notificationsTable.user_id, session.user.id),
          eq(notificationsTable.is_read, false),
        ),
      );

    return { success: true };
  });
