import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { rolesTable, permissionsTable, rolePermissionsTable } from '../../db/rbac-schema';
import { requirePermission } from '../../middleware/rbac';
import { eq } from 'drizzle-orm';

const DEFAULT_ROLES = ['user', 'moderator', 'database-maintainer', 'admin'];

export const adminRoleRoutes = new Elysia()
	.use(requirePermission('admin:roles'))

	// Get all available roles
	.get('/roles', async () => {
		try {
			const roles = await db.select().from(rolesTable);
			return { success: true, data: roles };
		} catch (err: any) {
			console.error('Get roles error:', err);
			return { success: false, error: err.message, status: 500 };
		}
	})

	// Get all permissions
	.get('/permissions', async () => {
		try {
			const permissions = await db.select().from(permissionsTable);
			return { success: true, data: permissions };
		} catch (err: any) {
			console.error('Get permissions error:', err);
			return { success: false, error: err.message, status: 500 };
		}
	})

	// Get single role with its permissions
	.get(
		'/roles/:id',
		async ({ params }) => {
			try {
				const [role] = await db
					.select()
					.from(rolesTable)
					.where(eq(rolesTable.id, params.id));

				if (!role) {
					return { success: false, error: 'Role not found', status: 404 };
				}

				const rolePerms = await db
					.select({ permissionId: rolePermissionsTable.permissionId })
					.from(rolePermissionsTable)
					.where(eq(rolePermissionsTable.roleId, params.id));

				return {
					success: true,
					data: {
						...role,
						permissions: rolePerms.map((rp) => rp.permissionId)
					}
				};
			} catch (err: any) {
				console.error('Get role error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() })
		}
	)

	// Create a new role
	.post(
		'/roles',
		async ({ body }) => {
			try {
				const id = body.name
					.toLowerCase()
					.replace(/\s+/g, '-')
					.replace(/[^a-z0-9-]/g, '');

				const [existing] = await db
					.select()
					.from(rolesTable)
					.where(eq(rolesTable.id, id));

				if (existing) {
					return { success: false, error: 'Role already exists', status: 400 };
				}

				const [role] = await db
					.insert(rolesTable)
					.values({ id, name: body.name, description: body.description ?? '' })
					.returning();

				return { success: true, data: role };
			} catch (err: any) {
				console.error('Create role error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			body: t.Object({
				name: t.String(),
				description: t.Optional(t.String())
			})
		}
	)

	// Update role name/description
	.put(
		'/roles/:id',
		async ({ params, body }) => {
			try {
				const [role] = await db
					.update(rolesTable)
					.set({ name: body.name, description: body.description })
					.where(eq(rolesTable.id, params.id))
					.returning();

				if (!role) {
					return { success: false, error: 'Role not found', status: 404 };
				}

				return { success: true, data: role };
			} catch (err: any) {
				console.error('Update role error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				name: t.String(),
				description: t.Optional(t.String())
			})
		}
	)

	// Delete a custom role (block default roles)
	.delete(
		'/roles/:id',
		async ({ params }) => {
			try {
				if (DEFAULT_ROLES.includes(params.id)) {
					return { success: false, error: 'Cannot delete default role', status: 400 };
				}

				const [role] = await db
					.delete(rolesTable)
					.where(eq(rolesTable.id, params.id))
					.returning();

				if (!role) {
					return { success: false, error: 'Role not found', status: 404 };
				}

				return { success: true, data: role };
			} catch (err: any) {
				console.error('Delete role error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() })
		}
	)

	// Set permissions for a role (full replace)
	.put(
		'/roles/:id/permissions',
		async ({ params, body }) => {
			try {
				const [role] = await db
					.select()
					.from(rolesTable)
					.where(eq(rolesTable.id, params.id));

				if (!role) {
					return { success: false, error: 'Role not found', status: 404 };
				}

				await db
					.delete(rolePermissionsTable)
					.where(eq(rolePermissionsTable.roleId, params.id));

				if (body.permissions.length > 0) {
					await db.insert(rolePermissionsTable).values(
						body.permissions.map((permId) => ({
							roleId: params.id,
							permissionId: permId
						}))
					);
				}

				return {
					success: true,
					data: { roleId: params.id, permissions: body.permissions }
				};
			} catch (err: any) {
				console.error('Set role permissions error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				permissions: t.Array(t.String())
			})
		}
	);
