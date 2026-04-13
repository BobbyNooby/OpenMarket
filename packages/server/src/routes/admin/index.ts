import { Elysia } from 'elysia';
import { requireAuth } from '../../middleware/rbac';
import { adminUserRoutes } from './users';
import { adminRoleRoutes } from './roles';
import { adminReportRoutes } from './reports';
import { adminAuditRoutes } from './audit';
import { adminAnalyticsRoutes } from './analytics';
import { adminSiteConfigRoutes } from './site-config';
import { adminMediaRoutes } from './media';

export const adminRoutes = new Elysia({ prefix: '/admin', detail: { tags: ['Admin'] } })
	.use(requireAuth())
	.use(adminUserRoutes)
	.use(adminRoleRoutes)
	.use(adminReportRoutes)
	.use(adminAuditRoutes)
	.use(adminAnalyticsRoutes)
	.use(adminSiteConfigRoutes)
	.use(adminMediaRoutes);
