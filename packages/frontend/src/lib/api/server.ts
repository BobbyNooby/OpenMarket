import { PUBLIC_API_URL } from "$env/static/public";
import { treaty } from "@elysiajs/eden";
import type { App } from "@openmarket/server";

export const api = treaty<App>(PUBLIC_API_URL);
