import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { reportsTable, userProfilesTable, listingsTable, profileReviewsTable } from '../../db/schemas';
import { userBansTable, userWarningsTable } from '../../db/rbac-schema';
import { user } from '../../db/auth-schema';
import { eq, desc, count, and, inArray, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { authMiddleware } from '../../middleware/rbac';
import { logAuditEvent } from '../../services/audit';
import { createNotification } from '../../services/notifications';

// Aliases for joining the user table multiple times
const resolverUser = alias(user, 'resolver_user');
const resolverProfile = alias(userProfilesTable, 'resolver_profile');
const targetUser = alias(user, 'target_user');
const targetProfile = alias(userProfilesTable, 'target_profile');
const actorUser = alias(user, 'actor_user');
const actorProfile = alias(userProfilesTable, 'actor_profile');

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

				// Resolve target user info for each report
				const targetInfo: Record<string, { id: string; name: string; username: string; image?: string }> = {};

				// Group targets by type for efficient lookups
				const userTargetIds = uniqueTargets.filter(t => t.type === 'user').map(t => t.id);
				const listingTargetIds = uniqueTargets.filter(t => t.type === 'listing').map(t => t.id);
				const reviewTargetIds = uniqueTargets.filter(t => t.type === 'review').map(t => t.id);

				// Direct user targets
				if (userTargetIds.length > 0) {
					const rows = await db
						.select({ id: targetUser.id, name: targetUser.name, image: targetUser.image, username: targetProfile.username })
						.from(targetUser)
						.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
						.where(inArray(targetUser.id, userTargetIds));
					for (const row of rows) {
						targetInfo[`user:${row.id}`] = { id: row.id, name: row.name, username: row.username ?? row.name, image: row.image ?? undefined };
					}
				}

				// Listing targets → look up author
				if (listingTargetIds.length > 0) {
					const rows = await db
						.select({
							listingId: listingsTable.id,
							userId: targetUser.id,
							name: targetUser.name,
							image: targetUser.image,
							username: targetProfile.username,
						})
						.from(listingsTable)
						.innerJoin(targetUser, eq(listingsTable.author_id, targetUser.id))
						.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
						.where(inArray(listingsTable.id, listingTargetIds));
					for (const row of rows) {
						targetInfo[`listing:${row.listingId}`] = { id: row.userId, name: row.name, username: row.username ?? row.name, image: row.image ?? undefined };
					}
				}

				// Review targets → look up voter (reviewer)
				if (reviewTargetIds.length > 0) {
					const rows = await db
						.select({
							reviewId: profileReviewsTable.id,
							userId: targetUser.id,
							name: targetUser.name,
							image: targetUser.image,
							username: targetProfile.username,
						})
						.from(profileReviewsTable)
						.innerJoin(targetUser, eq(profileReviewsTable.voter_user_id, targetUser.id))
						.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
						.where(inArray(profileReviewsTable.id, reviewTargetIds));
					for (const row of rows) {
						targetInfo[`review:${row.reviewId}`] = { id: row.userId, name: row.name, username: row.username ?? row.name, image: row.image ?? undefined };
					}
				}

				// Get resolver info for resolved reports
				const resolvedReportIds = reports
					.filter((r) => r.resolved_by)
					.map((r) => r.id);

				const resolverInfo: Record<string, { id: string; name: string; username: string | null }> = {};
				if (resolvedReportIds.length > 0) {
					const resolverRows = await db
						.select({
							reportId: reportsTable.id,
							resolverId: resolverUser.id,
							resolverName: resolverUser.name,
							resolverUsername: resolverProfile.username,
						})
						.from(reportsTable)
						.innerJoin(resolverUser, eq(reportsTable.resolved_by, resolverUser.id))
						.leftJoin(resolverProfile, eq(resolverUser.id, resolverProfile.userId))
						.where(and(
							isNotNull(reportsTable.resolved_by),
							inArray(reportsTable.id, resolvedReportIds)
						));

					for (const row of resolverRows) {
						resolverInfo[row.reportId] = {
							id: row.resolverId,
							name: row.resolverName,
							username: row.resolverUsername,
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
					target: targetInfo[`${r.target_type}:${r.target_id}`] ?? null,
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

				await logAuditEvent(session.user!.id, 'report.resolve', 'report', params.id, {
					status: body.status,
					targetType: existing.target_type,
					targetId: existing.target_id,
				});

				createNotification({
					userId: existing.reporter_id,
					type: "report_resolved",
					title: `Your report was ${body.status}`,
					body: `Your ${existing.target_type} report has been reviewed and ${body.status}.`,
				});

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

				type ModerationEvent = {
					id: string;
					event_type: 'report' | 'ban' | 'warning';
					reason: string | null;
					created_at: Date;
					status: string | null;
					actor: { id: string; name: string; username: string; image?: string };
					target_type: string;
					target_id: string;
					target_name: string;
					expires_at: Date | null;
				};

				const events: ModerationEvent[] = [];

				// Fetch reports
				if (!typeFilter || typeFilter === 'report') {
					const reportRows = await db
						.select({
							id: reportsTable.id,
							reason: reportsTable.reason,
							created_at: reportsTable.created_at,
							status: reportsTable.status,
							actor_id: reportsTable.reporter_id,
							actor_name: actorUser.name,
							actor_username: actorProfile.username,
							actor_image: actorUser.image,
							target_type: reportsTable.target_type,
							target_id: reportsTable.target_id,
						})
						.from(reportsTable)
						.innerJoin(actorUser, eq(reportsTable.reporter_id, actorUser.id))
						.leftJoin(actorProfile, eq(actorUser.id, actorProfile.userId))
						.orderBy(desc(reportsTable.created_at));

					// Resolve target names for reports
					const reportTargetIds = [...new Set(reportRows.map(r => `${r.target_type}:${r.target_id}`))];
					const reportTargetNames: Record<string, string> = {};

					const userIds = reportRows.filter(r => r.target_type === 'user').map(r => r.target_id);
					const listingIds = reportRows.filter(r => r.target_type === 'listing').map(r => r.target_id);
					const reviewIds = reportRows.filter(r => r.target_type === 'review').map(r => r.target_id);

					if (userIds.length > 0) {
						const rows = await db
							.select({ id: targetUser.id, username: targetProfile.username, name: targetUser.name })
							.from(targetUser)
							.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
							.where(inArray(targetUser.id, userIds));
						for (const r of rows) reportTargetNames[`user:${r.id}`] = r.username ?? r.name;
					}
					if (listingIds.length > 0) {
						const rows = await db
							.select({ listingId: listingsTable.id, username: targetProfile.username, name: targetUser.name })
							.from(listingsTable)
							.innerJoin(targetUser, eq(listingsTable.author_id, targetUser.id))
							.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
							.where(inArray(listingsTable.id, listingIds));
						for (const r of rows) reportTargetNames[`listing:${r.listingId}`] = r.username ?? r.name;
					}
					if (reviewIds.length > 0) {
						const rows = await db
							.select({ reviewId: profileReviewsTable.id, username: targetProfile.username, name: targetUser.name })
							.from(profileReviewsTable)
							.innerJoin(targetUser, eq(profileReviewsTable.voter_user_id, targetUser.id))
							.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
							.where(inArray(profileReviewsTable.id, reviewIds));
						for (const r of rows) reportTargetNames[`review:${r.reviewId}`] = r.username ?? r.name;
					}

					for (const r of reportRows) {
						events.push({
							id: r.id,
							event_type: 'report',
							reason: r.reason,
							created_at: r.created_at,
							status: r.status,
							actor: {
								id: r.actor_id,
								name: r.actor_name,
								username: r.actor_username ?? r.actor_name,
								image: r.actor_image ?? undefined,
							},
							target_type: r.target_type,
							target_id: r.target_id,
							target_name: reportTargetNames[`${r.target_type}:${r.target_id}`] ?? r.target_id,
							expires_at: null,
						});
					}
				}

				// Fetch bans
				if (!typeFilter || typeFilter === 'ban') {
					const banRows = await db
						.select({
							id: userBansTable.id,
							reason: userBansTable.reason,
							created_at: userBansTable.bannedAt,
							expires_at: userBansTable.expiresAt,
							actor_id: userBansTable.bannedBy,
							actor_name: actorUser.name,
							actor_username: actorProfile.username,
							actor_image: actorUser.image,
							target_id: userBansTable.userId,
							target_name: targetUser.name,
							target_username: targetProfile.username,
						})
						.from(userBansTable)
						.innerJoin(actorUser, eq(userBansTable.bannedBy, actorUser.id))
						.leftJoin(actorProfile, eq(actorUser.id, actorProfile.userId))
						.innerJoin(targetUser, eq(userBansTable.userId, targetUser.id))
						.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
						.orderBy(desc(userBansTable.bannedAt));

					const now = new Date();
					for (const b of banRows) {
						events.push({
							id: b.id,
							event_type: 'ban',
							reason: b.reason,
							created_at: b.created_at,
							status: b.expires_at && b.expires_at <= now ? 'expired' : 'active',
							actor: {
								id: b.actor_id,
								name: b.actor_name,
								username: b.actor_username ?? b.actor_name,
								image: b.actor_image ?? undefined,
							},
							target_type: 'user',
							target_id: b.target_id,
							target_name: b.target_username ?? b.target_name,
							expires_at: b.expires_at,
						});
					}
				}

				// Fetch warnings
				if (!typeFilter || typeFilter === 'warning') {
					const warningRows = await db
						.select({
							id: userWarningsTable.id,
							reason: userWarningsTable.reason,
							created_at: userWarningsTable.createdAt,
							actor_id: userWarningsTable.warnedBy,
							actor_name: actorUser.name,
							actor_username: actorProfile.username,
							actor_image: actorUser.image,
							target_id: userWarningsTable.userId,
							target_name: targetUser.name,
							target_username: targetProfile.username,
						})
						.from(userWarningsTable)
						.innerJoin(actorUser, eq(userWarningsTable.warnedBy, actorUser.id))
						.leftJoin(actorProfile, eq(actorUser.id, actorProfile.userId))
						.innerJoin(targetUser, eq(userWarningsTable.userId, targetUser.id))
						.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
						.orderBy(desc(userWarningsTable.createdAt));

					for (const w of warningRows) {
						events.push({
							id: w.id,
							event_type: 'warning',
							reason: w.reason,
							created_at: w.created_at,
							status: null,
							actor: {
								id: w.actor_id,
								name: w.actor_name,
								username: w.actor_username ?? w.actor_name,
								image: w.actor_image ?? undefined,
							},
							target_type: 'user',
							target_id: w.target_id,
							target_name: w.target_username ?? w.target_name,
							expires_at: null,
						});
					}
				}

				// Sort by created_at desc, then paginate
				events.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
				const total = events.length;
				const paged = events.slice(offset, offset + limit);

				const data = paged.map((r) => ({
					id: r.id,
					event_type: r.event_type,
					reason: r.reason,
					created_at: r.created_at.toISOString(),
					status: r.status,
					actor: r.actor,
					target_type: r.target_type,
					target_id: r.target_id,
					target_name: r.target_name,
					expires_at: r.expires_at?.toISOString() ?? null,
				}));

				return {
					success: true,
					data,
					pagination: { total, limit, offset, hasMore: offset + paged.length < total },
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
