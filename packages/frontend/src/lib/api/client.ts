import { treaty } from '@elysiajs/eden';
import type { App } from '@openmarket/server';

export const api = treaty<App>('http://localhost:3000');

// TODO: Auth will be handled by the API server
// Mock auth client for now - will be replaced with actual API auth
export const authClient = {
	getSession: async () => ({ data: null }),
	signIn: {
		social: async (_opts: { provider: string; callbackURL?: string }) => {
			console.log('Auth not implemented yet - will use API server');
		}
	},
	signOut: async () => {
		console.log('Auth not implemented yet - will use API server');
	}
};
