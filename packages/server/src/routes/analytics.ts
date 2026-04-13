import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/rbac";
import { trackEvent, type AnalyticsEventType } from "../services/analytics";

const VALID_EVENTS: AnalyticsEventType[] = [
  "page_view", "listing_view", "search", "filter_applied", "suggestion_clicked",
  "listing_contact", "listing_created", "listing_renewed", "listing_sold",
  "profile_view", "review_submitted", "report_submitted", "conversation_started",
];

// Simple in-memory rate limiter (per session, 100 events/minute)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(sessionId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(sessionId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 100) return false;
  entry.count++;
  return true;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}, 5 * 60_000);

export const analyticsRoutes = new Elysia({ prefix: "/telemetry", detail: { tags: ["Analytics"] } })
  .use(authMiddleware)

  .post(
    "/track",
    ({ body, session }) => {
      const sessionId = body.session_id || "anonymous";

      if (!checkRateLimit(sessionId)) {
        return { success: false, error: "Rate limit exceeded" };
      }

      if (!VALID_EVENTS.includes(body.event_type as AnalyticsEventType)) {
        return { success: false, error: "Invalid event type" };
      }

      trackEvent({
        type: body.event_type as AnalyticsEventType,
        userId: session?.user?.id ?? null,
        sessionId,
        metadata: body.metadata as Record<string, unknown> | undefined,
        path: body.path,
        referrer: body.referrer,
      });

      return { success: true };
    },
    {
      body: t.Object({
        event_type: t.String(),
        session_id: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Unknown())),
        path: t.Optional(t.String()),
        referrer: t.Optional(t.String()),
      }),
      detail: { description: 'Track a client-side analytics event' }
    },
  );
