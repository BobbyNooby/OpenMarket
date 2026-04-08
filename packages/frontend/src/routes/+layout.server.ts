import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

// Paths that authenticated-but-no-profile users are allowed to access.
// Everything else triggers a forced redirect to /onboarding.
const ONBOARDING_ALLOWED = ["/onboarding", "/login"];

// Default fallback if the public site config endpoint fails — keeps SSR working
// even when the API is down on first boot.
const FALLBACK_SITE_CONFIG = {
  site_name: "OpenMarket",
  site_tagline: "The marketplace for trading game items and currencies",
  site_logo_url: "",
  site_favicon_url: "",
  footer_text: "",
  support_url: "",
  discord_url: "",
};

type ThemeVariables = Record<string, string>;
type SiteTheme = { light: ThemeVariables; dark: ThemeVariables };
const FALLBACK_THEME: SiteTheme = { light: {}, dark: {} };

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

  // Fetch site config + theme — drives white-label branding everywhere
  let siteConfig: Record<string, string> = FALLBACK_SITE_CONFIG;
  let siteTheme: SiteTheme = FALLBACK_THEME;
  try {
    const res = await fetch(`${PUBLIC_API_URL}/site-config/public`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        siteConfig = { ...FALLBACK_SITE_CONFIG, ...(json.data.config ?? {}) };
        siteTheme = json.data.theme ?? FALLBACK_THEME;
      }
    }
  } catch {
    // fallback already set
  }

  return { session, unreadMessageCount, siteConfig, siteTheme };
};
