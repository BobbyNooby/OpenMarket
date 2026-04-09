import { Elysia } from 'elysia';
import { listingsBrowseRoutes } from './browse';
import { listingsManageRoutes } from './manage';
import { listingAnalyticsRoutes } from './analytics';
import { listingPreviewRoutes } from './preview';

export const listingsRoutes = new Elysia({ prefix: '/listings' })
	.use(listingsBrowseRoutes)
	.use(listingsManageRoutes)
	.use(listingAnalyticsRoutes)
	.use(listingPreviewRoutes);
