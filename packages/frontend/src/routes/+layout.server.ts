import type { LayoutServerLoad } from "./$types";
import { PUBLIC_API_URL } from "$env/static/public";

export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
  let session = null;
  try {
    const sessionToken = cookies.get("better-auth.session_token");
    const res = await fetch(`${PUBLIC_API_URL}/api/auth/get-session`, {
      credentials: "include",
      headers: sessionToken
        ? { Cookie: `better-auth.session_token=${sessionToken}` }
        : {},
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        session = data;
      }
    }
  } catch {
    // not logged in
  }

  // Fetch unread message count for header badge
  let unreadMessageCount = 0;
  if (session?.user) {
    try {
      const sessionToken = cookies.get("better-auth.session_token");
      const unreadRes = await fetch(`${PUBLIC_API_URL}/api/conversations/unread-count`, {
        headers: sessionToken
          ? { Cookie: `better-auth.session_token=${sessionToken}` }
          : {},
      });
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json();
        if (unreadData.success) unreadMessageCount = unreadData.count;
      }
    } catch {
      // ignore
    }
  }

  return { session, unreadMessageCount };
};
