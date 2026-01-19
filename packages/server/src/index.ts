import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
	.use(
		cors({
			origin: ['http://localhost:5173', 'http://localhost:4173'],
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			credentials: true
		})
	)
	.get('/', () => 'OpenMarket API')
	.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
	.listen(3000);

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
