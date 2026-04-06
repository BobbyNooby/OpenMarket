import { PUBLIC_API_URL } from '$env/static/public';

type EventType =
  | 'page_view'
  | 'listing_view'
  | 'search'
  | 'filter_applied'
  | 'suggestion_clicked'
  | 'listing_contact'
  | 'listing_created'
  | 'listing_renewed'
  | 'listing_sold'
  | 'profile_view'
  | 'review_submitted'
  | 'report_submitted'
  | 'conversation_started';

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;

  // Check for existing session cookie
  const match = document.cookie.match(/(?:^|; )om_sid=([^;]*)/);
  if (match) {
    sessionId = match[1];
    return sessionId;
  }

  // Generate new session ID
  sessionId = crypto.randomUUID();
  document.cookie = `om_sid=${sessionId}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
  return sessionId;
}

// Fire-and-forget analytics tracking
// Silently fails if the API is unreachable
export function track(type: EventType, metadata?: Record<string, unknown>) {
  try {
    const body: Record<string, unknown> = {
      event_type: type,
      session_id: getSessionId(),
      path: window.location.pathname,
    };

    if (metadata && Object.keys(metadata).length > 0) {
      body.metadata = metadata;
    }

    if (document.referrer) {
      body.referrer = document.referrer;
    }

    // Use sendBeacon for fire-and-forget (survives page unloads)
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    const sent = navigator.sendBeacon(`${PUBLIC_API_URL}/telemetry/track`, blob);

    // Fallback to fetch if sendBeacon fails
    if (!sent) {
      fetch(`${PUBLIC_API_URL}/telemetry/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never throw — analytics must not break the app
  }
}
