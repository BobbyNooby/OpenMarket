import { db } from "../db/db";
import { notificationsTable, userProfilesTable } from "../db/schemas";
import { eq } from "drizzle-orm";
import { sendToUser } from "../routes/ws/connection-manager";

export type NotificationType =
  | "new_message"
  | "new_review"
  | "listing_expired"
  | "listing_sold"
  | "role_changed"
  | "warning_received"
  | "report_resolved";

interface NotificationTemplates {
  title: string;
  body?: string;
  link?: string;
}

const defaultTemplates: Record<NotificationType, NotificationTemplates> = {
  new_message: { title: "New message" },
  new_review: { title: "New review on your profile" },
  listing_expired: { title: "Your listing has expired" },
  listing_sold: { title: "Your listing was marked as sold" },
  role_changed: { title: "Your role has been updated" },
  warning_received: { title: "You received a warning" },
  report_resolved: { title: "Your report has been resolved" },
};

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title?: string;
  body?: string;
  link?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: CreateNotificationOptions) {
  const template = defaultTemplates[type];

  // Respect the user's notification preferences. Empty object = all enabled (default).
  // Only an explicit `false` disables a type, so new types ship enabled by default.
  try {
    const [profile] = await db
      .select({ notification_preferences: userProfilesTable.notification_preferences })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId))
      .limit(1);

    if (profile?.notification_preferences) {
      const prefs = JSON.parse(profile.notification_preferences) as Record<string, boolean>;
      if (prefs[type] === false) return null;
    }
  } catch (err) {
    // Fire-and-forget: never block on a preferences read failure
    console.error("Failed to read notification preferences:", err);
  }

  const [notification] = await db
    .insert(notificationsTable)
    .values({
      user_id: userId,
      type,
      title: title ?? template.title,
      body: body ?? template.body ?? null,
      link: link ?? template.link ?? null,
    })
    .returning();

  // Push via WebSocket if user is connected
  sendToUser(userId, {
    type: "notification",
    data: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      is_read: notification.is_read,
      created_at: notification.created_at.toISOString(),
    },
  });

  return notification;
}
