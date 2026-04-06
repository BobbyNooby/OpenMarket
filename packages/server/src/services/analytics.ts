import { db } from "../db/db";
import { analyticsEventsTable } from "../db/schemas";

// --- Event Type Catalog ---
// Each event type has a documented metadata shape for consistency

export type AnalyticsEventType =
  | "page_view"         // { }
  | "listing_view"      // { listing_id, source?: "browse"|"search"|"direct" }
  | "search"            // { query, result_count, filters?: object }
  | "filter_applied"    // { filter_type, value }
  | "suggestion_clicked"// { type: "item"|"currency", id, name, query }
  | "listing_contact"   // { listing_id, author_id }
  | "listing_created"   // { listing_id, order_type, item_id? }
  | "listing_renewed"   // { listing_id }
  | "listing_sold"      // { listing_id }
  | "profile_view"      // { target_user_id }
  | "review_submitted"  // { target_user_id, type: "upvote"|"downvote" }
  | "report_submitted"  // { target_type, target_id }
  | "conversation_started"; // { conversation_id, target_user_id, listing_id? }

interface TrackEventOptions {
  type: AnalyticsEventType;
  userId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
  path?: string;
  referrer?: string;
}

// Fire-and-forget event tracking
// Errors are logged but never thrown
export function trackEvent({ type, userId, sessionId, metadata, path, referrer }: TrackEventOptions) {
  db.insert(analyticsEventsTable)
    .values({
      event_type: type,
      user_id: userId ?? null,
      session_id: sessionId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      path: path ?? null,
      referrer: referrer ?? null,
    })
    .then(() => {})
    .catch((err) => console.error("[analytics] Failed to track event:", err));
}
