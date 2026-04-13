import { PUBLIC_API_URL } from "$env/static/public";
import { env } from "$env/dynamic/private";
import { treaty } from "@elysiajs/eden";
import type { App } from "@openmarket/server";

// In Docker, server-side requests need the internal service URL (http://server:3000)
// while client-side requests need the external URL (http://localhost:3000)
const SERVER_API_URL = env.API_URL || PUBLIC_API_URL;

export const api = treaty<App>(SERVER_API_URL);
