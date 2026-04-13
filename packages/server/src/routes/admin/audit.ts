import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { auditLogsTable } from '../../db/rbac-schema';
import { user } from '../../db/auth-schema';
import { userProfilesTable } from '../../db/schemas';
import { eq, desc, count, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { authMiddleware } from '../../middleware/rbac';

const actorUser = alias(user, 'actor_user');
const actorProfile = alias(userProfilesTable, 'actor_profile');
const targetUser = alias(user, 'target_user');
const targetProfile = alias(userProfilesTable, 'target_profile');

export const adminAuditRoutes = new Elysia()
	.use(authMiddleware)

	.get(
		'/audit-logs',
		async ({ query, session, set }) => {
			if (!session.permissions.includes('audit:read')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
				const offset = Math.max(parseInt(query.offset || '0', 10), 0);
				const actionFilter = query.action?.trim() || '';
				const actorFilter = query.actor?.trim() || '';
				const targetTypeFilter = query.target_type?.trim() || '';

				const conditions: ReturnType<typeof eq>[] = [];

				if (actionFilter) {
					conditions.push(eq(auditLogsTable.action, actionFilter));
				}
				if (actorFilter) {
					conditions.push(eq(auditLogsTable.actorId, actorFilter));
				}
				if (targetTypeFilter) {
					conditions.push(eq(auditLogsTable.targetType, targetTypeFilter));
				}

				const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

				const [{ total }] = await db
					.select({ total: count() })
					.from(auditLogsTable)
					.where(whereClause);

				const logs = await db
					.select({
						id: auditLogsTable.id,
						action: auditLogsTable.action,
						targetType: auditLogsTable.targetType,
						targetId: auditLogsTable.targetId,
						metadata: auditLogsTable.metadata,
						createdAt: auditLogsTable.createdAt,
						actorId: auditLogsTable.actorId,
						actorName: actorUser.name,
						actorImage: actorUser.image,
						actorUsername: actorProfile.username,
						targetName: targetUser.name,
						targetImage: targetUser.image,
						targetUsername: targetProfile.username,
					})
					.from(auditLogsTable)
					.innerJoin(actorUser, eq(auditLogsTable.actorId, actorUser.id))
					.leftJoin(actorProfile, eq(actorUser.id, actorProfile.userId))
					.leftJoin(targetUser, eq(auditLogsTable.targetId, targetUser.id))
					.leftJoin(targetProfile, eq(targetUser.id, targetProfile.userId))
					.where(whereClause)
					.orderBy(desc(auditLogsTable.createdAt))
					.limit(limit)
					.offset(offset);

				const data = logs.map((l) => {
					const target = l.targetName
						? {
							id: l.targetId,
							name: l.targetName,
							username: l.targetUsername ?? l.targetName,
							image: l.targetImage ?? undefined,
						}
						: l.metadata?.deletedUserName
							? {
								id: l.targetId,
								name: String(l.metadata.deletedUserName),
								username: String(l.metadata.deletedUserName),
							}
							: null;
					return {
						id: l.id,
						action: l.action,
						target_type: l.targetType,
						target_id: l.targetId,
						target,
						metadata: l.metadata,
						created_at: l.createdAt.toISOString(),
						actor: {
							id: l.actorId,
							name: l.actorName,
							username: l.actorUsername ?? l.actorName,
							image: l.actorImage ?? undefined,
						},
					};
				});

				return {
					success: true,
					data,
					pagination: { total, limit, offset, hasMore: offset + logs.length < total },
				};
			} catch (err: any) {
				console.error('Get audit logs error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
				action: t.Optional(t.String()),
				actor: t.Optional(t.String()),
				target_type: t.Optional(t.String()),
			}),
			detail: { description: 'List audit log entries with filters' }
		}
	);
