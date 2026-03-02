import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { reportsTable, userProfilesTable } from '../../db/schemas';
import { userBansTable, userWarningsTable } from '../../db/rbac-schema';
import { user } from '../../db/auth-schema';
import { eq, desc, count, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../../middleware/rbac';

export const adminReportRoutes = new Elysia()
	.use(authMiddleware)

	// Get paginated reports with optional status filter
	.get(
		'/reports',
		async ({ query, session, set }) => {
			if (!session.permissions.includes('report:moderate')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
				const offset = Math.max(parseInt(query.offset || '0', 10), 0);
				const statusFilter = query.status?.trim() || '';

				const conditions: ReturnType<typeof eq>[] = [];
				if (statusFilter && ['pending', 'resolved', 'dismissed'].includes(statusFilter)) {
					conditions.push(
						eq(reportsTable.status, statusFilter as 'pending' | 'resolved' | 'dismissed')
					);
				}

				const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

				const [{ total }] = await db
					.select({ total: count() })
					.from(reportsTable)
					.where(whereClause);

				const reports = await db
					.select({
						id: reportsTable.id,
						target_type: reportsTable.target_type,
						target_id: reportsTable.target_id,
						reason: reportsTable.reason,
						status: reportsTable.status,
						created_at: reportsTable.created_at,
						resolved_by: reportsTable.resolved_by,
						resolved_at: reportsTable.resolved_at,
						reporter_id: reportsTable.reporter_id,
						reporter_name: user.name,
						reporter_image: user.image,
						reporter_username: userProfilesTable.username,
					})
					.from(reportsTable)
					.innerJoin(user, eq(reportsTable.reporter_id, user.id))
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.where(whereClause)
					.orderBy(desc(reportsTable.created_at))
					.limit(limit)
					.offset(offset);

				// Get report counts per target
				const uniqueTargets = [
					...new Map(
						reports.map((r) => [`${r.target_type}:${r.target_id}`, { type: r.target_type, id: r.target_id }])
					).values(),
				];

				const targetReportCounts: Record<string, number> = {};
				for (const target of uniqueTargets) {
					const [{ cnt }] = await db
						.select({ cnt: count() })
						.from(reportsTable)
						.where(
							and(
								eq(reportsTable.target_type, target.type),
								eq(reportsTable.target_id, target.id)
							)
						);
					targetReportCounts[`${target.type}:${target.id}`] = cnt;
				}

				// Get resolver info for resolved reports
				const resolvedReportIds = reports
					.filter((r) => r.resolved_by)
					.map((r) => r.id);

				const resolverInfo: Record<string, { id: string; name: string; username: string | null }> = {};
				if (resolvedReportIds.length > 0) {
					const resolverRows = await db.execute(sql`
						SELECT r.id as report_id, u.id as resolver_id, u.name as resolver_name,
							up.username as resolver_username
						FROM reports r
						INNER JOIN "user" u ON r.resolved_by = u.id
						LEFT JOIN user_profiles up ON u.id = up.user_id
						WHERE r.resolved_by IS NOT NULL
						AND r.id = ANY(ARRAY[${sql.join(resolvedReportIds.map(id => sql`${id}`), sql`, `)}]::uuid[])
					`) as unknown as { report_id: string; resolver_id: string; resolver_name: string; resolver_username: string | null }[];

					for (const row of resolverRows) {
						resolverInfo[row.report_id] = {
							id: row.resolver_id,
							name: row.resolver_name,
							username: row.resolver_username,
						};
					}
				}

				const data = reports.map((r) => ({
					id: r.id,
					target_type: r.target_type,
					target_id: r.target_id,
					reason: r.reason,
					status: r.status,
					created_at: r.created_at.toISOString(),
					resolved_at: r.resolved_at?.toISOString() ?? null,
					reporter: {
						id: r.reporter_id,
						name: r.reporter_name,
						image: r.reporter_image ?? undefined,
						username: r.reporter_username ?? r.reporter_name,
					},
					resolved_by: resolverInfo[r.id] ?? null,
					report_count: targetReportCounts[`${r.target_type}:${r.target_id}`] ?? 1,
				}));

				return {
					success: true,
					data,
					pagination: { total, limit, offset, hasMore: offset + reports.length < total },
				};
			} catch (err: any) {
				console.error('Get admin reports error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
				status: t.Optional(t.String()),
			})
		}
	)

	// Update report status (resolve or dismiss)
	.patch(
		'/reports/:id',
		async ({ params, body, session, set }) => {
			if (!session.permissions.includes('report:moderate')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const [existing] = await db
					.select()
					.from(reportsTable)
					.where(eq(reportsTable.id, params.id));

				if (!existing) {
					set.status = 404;
					return { success: false, error: 'Report not found' };
				}

				if (existing.status !== 'pending') {
					set.status = 400;
					return { success: false, error: 'Report has already been processed' };
				}

				const [updated] = await db
					.update(reportsTable)
					.set({
						status: body.status,
						resolved_by: session.user!.id,
						resolved_at: new Date(),
					})
					.where(eq(reportsTable.id, params.id))
					.returning();

				return { success: true, data: updated };
			} catch (err: any) {
				console.error('Update report error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				status: t.Union([t.Literal('resolved'), t.Literal('dismissed')]),
			})
		}
	)

	// Get unified moderation log (reports + bans + warnings)
	.get(
		'/moderation-log',
		async ({ query, session, set }) => {
			if (!session.permissions.includes('report:moderate') && !session.permissions.includes('user:ban') && !session.permissions.includes('user:warn')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
				const offset = Math.max(parseInt(query.offset || '0', 10), 0);
				const typeFilter = query.type?.trim() || '';

				const rows = await db.execute(sql`
					SELECT * FROM (
						SELECT
							r.id,
							'report' as event_type,
							r.reason,
							r.created_at,
							r.status::text as status,
							r.reporter_id as actor_id,
							u_actor.name as actor_name,
							up_actor.username as actor_username,
							u_actor.image as actor_image,
							r.target_type,
							r.target_id,
							NULL as target_name,
							NULL as target_username,
							r.resolved_by,
							r.resolved_at,
							NULL as expires_at
						FROM reports r
						INNER JOIN "user" u_actor ON r.reporter_id = u_actor.id
						LEFT JOIN user_profiles up_actor ON u_actor.id = up_actor.user_id
						${typeFilter && typeFilter !== 'report' ? sql`WHERE 1=0` : sql``}

						UNION ALL

						SELECT
							b.id,
							'ban' as event_type,
							b.reason,
							b.banned_at as created_at,
							CASE WHEN b.expires_at IS NOT NULL AND b.expires_at <= NOW() THEN 'expired' ELSE 'active' END as status,
							b.banned_by as actor_id,
							u_actor.name as actor_name,
							up_actor.username as actor_username,
							u_actor.image as actor_image,
							'user' as target_type,
							b.user_id as target_id,
							u_target.name as target_name,
							up_target.username as target_username,
							NULL as resolved_by,
							NULL as resolved_at,
							b.expires_at
						FROM user_bans b
						INNER JOIN "user" u_actor ON b.banned_by = u_actor.id
						LEFT JOIN user_profiles up_actor ON u_actor.id = up_actor.user_id
						INNER JOIN "user" u_target ON b.user_id = u_target.id
						LEFT JOIN user_profiles up_target ON u_target.id = up_target.user_id
						${typeFilter && typeFilter !== 'ban' ? sql`WHERE 1=0` : sql``}

						UNION ALL

						SELECT
							w.id,
							'warning' as event_type,
							w.reason,
							w.created_at,
							NULL as status,
							w.warned_by as actor_id,
							u_actor.name as actor_name,
							up_actor.username as actor_username,
							u_actor.image as actor_image,
							'user' as target_type,
							w.user_id as target_id,
							u_target.name as target_name,
							up_target.username as target_username,
							NULL as resolved_by,
							NULL as resolved_at,
							NULL as expires_at
						FROM user_warnings w
						INNER JOIN "user" u_actor ON w.warned_by = u_actor.id
						LEFT JOIN user_profiles up_actor ON u_actor.id = up_actor.user_id
						INNER JOIN "user" u_target ON w.user_id = u_target.id
						LEFT JOIN user_profiles up_target ON u_target.id = up_target.user_id
						${typeFilter && typeFilter !== 'warning' ? sql`WHERE 1=0` : sql``}
					) combined
					ORDER BY created_at DESC
					LIMIT ${limit} OFFSET ${offset}
				`) as unknown as {
					id: string;
					event_type: 'report' | 'ban' | 'warning';
					reason: string | null;
					created_at: string;
					status: string | null;
					actor_id: string;
					actor_name: string;
					actor_username: string | null;
					actor_image: string | null;
					target_type: string;
					target_id: string;
					target_name: string | null;
					target_username: string | null;
					resolved_by: string | null;
					resolved_at: string | null;
					expires_at: string | null;
				}[];

				// Get total count
				const countResult = await db.execute(sql`
					SELECT (
						${typeFilter === '' || typeFilter === 'report' ? sql`(SELECT COUNT(*) FROM reports)` : sql`0`}
						+ ${typeFilter === '' || typeFilter === 'ban' ? sql`(SELECT COUNT(*) FROM user_bans)` : sql`0`}
						+ ${typeFilter === '' || typeFilter === 'warning' ? sql`(SELECT COUNT(*) FROM user_warnings)` : sql`0`}
					) as total
				`) as unknown as { total: string }[];

				const total = parseInt(countResult[0]?.total || '0', 10);

				const data = rows.map((r) => ({
					id: r.id,
					event_type: r.event_type,
					reason: r.reason,
					created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
					status: r.status,
					actor: {
						id: r.actor_id,
						name: r.actor_name,
						username: r.actor_username ?? r.actor_name,
						image: r.actor_image ?? undefined,
					},
					target_type: r.target_type,
					target_id: r.target_id,
					target_name: r.target_username ?? r.target_name ?? r.target_id,
					expires_at: r.expires_at ? (typeof r.expires_at === 'string' ? r.expires_at : new Date(r.expires_at).toISOString()) : null,
				}));

				return {
					success: true,
					data,
					pagination: { total, limit, offset, hasMore: offset + rows.length < total },
				};
			} catch (err: any) {
				console.error('Get moderation log error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
				type: t.Optional(t.String()),
			})
		}
	);
