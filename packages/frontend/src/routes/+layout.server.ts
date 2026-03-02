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

  return { session };
};
