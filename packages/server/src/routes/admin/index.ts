import { Elysia } from 'elysia';
import { requirePermission } from '../../middleware/rbac';
import { adminUserRoutes } from './users';
import { adminRoleRoutes } from './roles';

export const adminRoutes = new Elysia({ prefix: '/admin' })
	.use(requirePermission('admin:roles'))
	.use(adminUserRoutes)
	.use(adminRoleRoutes);
