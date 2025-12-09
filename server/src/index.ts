import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { usersRoutes } from './routes/users';
import { itemsRoutes, currenciesRoutes } from './routes/items';
import { listingsRoutes } from './routes/listings';

const app = new Elysia()
	.use(cors({
		origin: ['http://localhost:5173', 'http://localhost:4173'],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		credentials: true
	}))
	.get('/hi', () => 'Hello Elysia')
	.use(usersRoutes)
	.use(itemsRoutes)
	.use(currenciesRoutes)
	.use(listingsRoutes)
	.listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
