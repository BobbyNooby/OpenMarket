import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { user } from '../../db/auth-schema';
import { userProfilesTable } from '../../db/schemas';
import { rolesTable, userRolesTable, userBansTable, userWarningsTable } from '../../db/rbac-schema';
import { eq, ilike, or, and, desc, inArray, count, exists, sql } from 'drizzle-orm';
import { assignRole, removeRole, authMiddleware } from '../../middleware/rbac';

export const adminUserRoutes = new Elysia()
	.use(authMiddleware)

	// Get paginated user list with search and role filter
	.get(
		'/users',
		async ({ query, session, set }) => {
			if (!session.permissions.includes('admin:users') && !session.permissions.includes('admin:roles')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

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
		async ({ params, body, session, set }) => {
			if (!session.permissions.includes('admin:roles')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

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
		async ({ params, session, set }) => {
			if (!session.permissions.includes('admin:roles')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

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
	)

	// Ban a user
	.post(
		'/users/:id/ban',
		async ({ params, body, session, set }) => {
			if (!session.permissions.includes('user:ban')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const [targetUser] = await db
					.select({ id: user.id })
					.from(user)
					.where(eq(user.id, params.id));

				if (!targetUser) {
					set.status = 404;
					return { success: false, error: 'User not found' };
				}

				// Check for existing active ban
				const existingBans = await db
					.select()
					.from(userBansTable)
					.where(eq(userBansTable.userId, params.id));

				const now = new Date();
				const hasActiveBan = existingBans.some(
					(b) => !b.expiresAt || b.expiresAt > now
				);

				if (hasActiveBan) {
					set.status = 400;
					return { success: false, error: 'User is already banned' };
				}

				const [ban] = await db
					.insert(userBansTable)
					.values({
						userId: params.id,
						bannedBy: session.user!.id,
						reason: body.reason,
						expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
					})
					.returning();

				return { success: true, data: ban };
			} catch (err: any) {
				console.error('Ban user error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				reason: t.String({ minLength: 1 }),
				expiresAt: t.Optional(t.String()),
			})
		}
	)

	// Unban a user (remove all active bans)
	.delete(
		'/users/:id/ban',
		async ({ params, session, set }) => {
			if (!session.permissions.includes('user:unban')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const deleted = await db
					.delete(userBansTable)
					.where(eq(userBansTable.userId, params.id))
					.returning();

				if (deleted.length === 0) {
					set.status = 404;
					return { success: false, error: 'No bans found for this user' };
				}

				return { success: true, message: `Removed ${deleted.length} ban(s) for user ${params.id}` };
			} catch (err: any) {
				console.error('Unban user error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() })
		}
	)

	// Warn a user
	.post(
		'/users/:id/warn',
		async ({ params, body, session, set }) => {
			if (!session.permissions.includes('user:warn')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const [targetUser] = await db
					.select({ id: user.id })
					.from(user)
					.where(eq(user.id, params.id));

				if (!targetUser) {
					set.status = 404;
					return { success: false, error: 'User not found' };
				}

				const [warning] = await db
					.insert(userWarningsTable)
					.values({
						userId: params.id,
						warnedBy: session.user!.id,
						reason: body.reason,
					})
					.returning();

				return { success: true, data: warning };
			} catch (err: any) {
				console.error('Warn user error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				reason: t.String({ minLength: 1 }),
			})
		}
	)

	// Get ban/warning history for a user
	.get(
		'/users/:id/history',
		async ({ params, session, set }) => {
			if (!session.permissions.includes('user:ban') && !session.permissions.includes('user:warn')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const bannedByUser = db.$with('banned_by_user').as(
					db.select({ id: user.id, name: user.name }).from(user)
				);

				const bans = await db
					.select({
						id: userBansTable.id,
						reason: userBansTable.reason,
						bannedAt: userBansTable.bannedAt,
						expiresAt: userBansTable.expiresAt,
						bannedById: userBansTable.bannedBy,
						bannedByName: user.name,
					})
					.from(userBansTable)
					.innerJoin(user, eq(userBansTable.bannedBy, user.id))
					.where(eq(userBansTable.userId, params.id))
					.orderBy(desc(userBansTable.bannedAt));

				const warningRows = await db.execute(sql`
					SELECT w.id, w.reason, w.created_at, w.warned_by,
						u.name as warned_by_name
					FROM user_warnings w
					INNER JOIN "user" u ON w.warned_by = u.id
					WHERE w.user_id = ${params.id}
					ORDER BY w.created_at DESC
				`) as unknown as { id: string; reason: string; created_at: string; warned_by: string; warned_by_name: string }[];

				const now = new Date();
				return {
					success: true,
					data: {
						bans: bans.map((b) => ({
							id: b.id,
							type: 'ban' as const,
							reason: b.reason,
							bannedAt: b.bannedAt.toISOString(),
							expiresAt: b.expiresAt?.toISOString() ?? null,
							issuedBy: { id: b.bannedById, name: b.bannedByName },
							isActive: !b.expiresAt || b.expiresAt > now,
						})),
						warnings: warningRows.map((w) => ({
							id: w.id,
							type: 'warning' as const,
							reason: w.reason,
							createdAt: new Date(w.created_at).toISOString(),
							issuedBy: { id: w.warned_by, name: w.warned_by_name },
						})),
					},
				};
			} catch (err: any) {
				console.error('Get user history error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() })
		}
	)

	// Delete a user permanently
	.delete(
		'/users/:id',
		async ({ params, session, set }) => {
			if (!session.permissions.includes('user:delete')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			if (params.id === session.user!.id) {
				set.status = 400;
				return { success: false, error: 'You cannot delete your own account' };
			}

			try {
				const [targetUser] = await db
					.select({ id: user.id, name: user.name })
					.from(user)
					.where(eq(user.id, params.id));

				if (!targetUser) {
					set.status = 404;
					return { success: false, error: 'User not found' };
				}

				await db.delete(user).where(eq(user.id, params.id));

				return {
					success: true,
					message: `User "${targetUser.name}" has been permanently deleted`
				};
			} catch (err: any) {
				console.error('Delete user error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() })
		}
	);
