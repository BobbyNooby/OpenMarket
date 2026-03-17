import { Elysia } from 'elysia';
import { listingsBrowseRoutes } from './browse';
import { listingsManageRoutes } from './manage';

export const listingsRoutes = new Elysia({ prefix: '/listings' })
	.use(listingsBrowseRoutes)
	.use(listingsManageRoutes);
