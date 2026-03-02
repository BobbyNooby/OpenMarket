import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { user } from '../../db/auth-schema';
import { userProfilesTable } from '../../db/schemas';
import { rolesTable, userRolesTable, userBansTable } from '../../db/rbac-schema';
import { eq, ilike, or, and, desc, inArray, count, exists } from 'drizzle-orm';
import { assignRole, removeRole } from '../../middleware/rbac';

export const adminUserRoutes = new Elysia()

	// Get paginated user list with search and role filter
	.get(
		'/users',
		async ({ query }) => {
			try {
				const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
				const offset = Math.max(parseInt(query.offset || '0', 10), 0);
				const search = query.search?.trim() || '';
				const roleFilter = query.role?.trim() || '';

				const conditions: ReturnType<typeof eq>[] = [];

				if (search) {
					const pattern = `%${search}%`;
					const searchCondition = or(
						ilike(user.name, pattern),
						ilike(user.email, pattern),
						ilike(userProfilesTable.username, pattern)
					);
					if (searchCondition) conditions.push(searchCondition);
				}

				if (roleFilter) {
					conditions.push(
						exists(
							db
								.select()
								.from(userRolesTable)
								.where(
									and(
										eq(userRolesTable.userId, user.id),
										eq(userRolesTable.roleId, roleFilter)
									)
								)
						)
					);
				}

				const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

				const [{ total }] = await db
					.select({ total: count() })
					.from(user)
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.where(whereClause);

				const users = await db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
						image: user.image,
						createdAt: user.createdAt,
						username: userProfilesTable.username
					})
					.from(user)
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.where(whereClause)
					.orderBy(desc(user.createdAt))
					.limit(limit)
					.offset(offset);

				const userIds = users.map((u) => u.id);

				const allRoles =
					userIds.length > 0
						? await db
								.select()
								.from(userRolesTable)
								.where(inArray(userRolesTable.userId, userIds))
						: [];

				const allBans =
					userIds.length > 0
						? await db
								.select()
								.from(userBansTable)
								.where(inArray(userBansTable.userId, userIds))
						: [];

				const rolesMap: Record<string, string[]> = {};
				for (const r of allRoles) {
					if (!rolesMap[r.userId]) rolesMap[r.userId] = [];
					rolesMap[r.userId].push(r.roleId);
				}

				const bansMap: Record<string, typeof allBans> = {};
				for (const b of allBans) {
					if (!bansMap[b.userId]) bansMap[b.userId] = [];
					bansMap[b.userId].push(b);
				}

				const data = users.map((u) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					image: u.image ?? undefined,
					username: u.username ?? u.name,
					created_at: u.createdAt.toISOString(),
					roles: rolesMap[u.id] || [],
					is_banned: (bansMap[u.id] || []).some(
						(b) => !b.expiresAt || b.expiresAt > new Date()
					)
				}));

				return {
					success: true,
					data,
					pagination: {
						total,
						limit,
						offset,
						hasMore: offset + users.length < total
					}
				};
			} catch (err: any) {
				console.error('Get admin users error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
				search: t.Optional(t.String()),
				role: t.Optional(t.String())
			})
		}
	)

	// Assign role to user
	.post(
		'/users/:id/roles',
		async ({ params, body }) => {
			try {
				const [role] = await db
					.select()
					.from(rolesTable)
					.where(eq(rolesTable.id, body.role));

				if (!role) {
					return { success: false, error: 'Role not found', status: 404 };
				}

				await assignRole(params.id, body.role);
				return {
					success: true,
					message: `Role "${body.role}" assigned to user ${params.id}`
				};
			} catch (err: any) {
				console.error('Assign role error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ role: t.String() })
		}
	)

	// Remove role from user
	.delete(
		'/users/:id/roles/:role',
		async ({ params }) => {
			try {
				await removeRole(params.id, params.role);
				return {
					success: true,
					message: `Role "${params.role}" removed from user ${params.id}`
				};
			} catch (err: any) {
				console.error('Remove role error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String(), role: t.String() })
		}
	);
