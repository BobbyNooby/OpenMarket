import { treaty } from '@elysiajs/eden';
import type { App } from '../../../server/src/index';
import { createAuthClient } from 'better-auth/client';

// @ts-expect-error - Type mismatch due to separate elysia installations in frontend/server
export const api = treaty<App>('http://localhost:3000');

export const authClient = createAuthClient({
	baseURL: 'http://localhost:5173'
});
