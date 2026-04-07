import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

// Paths that authenticated-but-no-profile users are allowed to access.
// Everything else triggers a forced redirect to /onboarding.
const ONBOARDING_ALLOWED = ["/onboarding", "/login"];

export const load: LayoutServerLoad = async ({ fetch, cookies, url }) => {
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

  // Onboarding guard — logged in but no marketplace profile yet
  if (session?.user && session.hasProfile === false) {
    const allowed = ONBOARDING_ALLOWED.some((p) => url.pathname.startsWith(p));
    if (!allowed) throw redirect(302, "/onboarding");
  }

  // Once onboarded, bounce users away from /onboarding if they revisit it
  if (session?.user && session.hasProfile === true && url.pathname.startsWith("/onboarding")) {
    throw redirect(302, "/");
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
