import { Elysia } from 'elysia';
import { requireAuth } from '../../middleware/rbac';
import { adminUserRoutes } from './users';
import { adminRoleRoutes } from './roles';

export const adminRoutes = new Elysia({ prefix: '/admin' })
	.use(requireAuth())
	.use(adminUserRoutes)
	.use(adminRoleRoutes);
