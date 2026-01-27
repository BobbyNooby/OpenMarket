import { PUBLIC_API_URL } from "$env/static/public";
import { createAuthClient } from "better-auth/svelte";

// Auth client for client-side OAuth flows (sign in/out)
export const authClient = createAuthClient({
  baseURL: PUBLIC_API_URL,
});
