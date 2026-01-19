import { treaty } from '@elysiajs/eden';
import type { App } from '@openmarket/server';
import { createAuthClient } from 'better-auth/svelte';

export const api = treaty<App>('http://localhost:3000');

export const authClient = createAuthClient({
	baseURL: 'http://localhost:3000'
});
