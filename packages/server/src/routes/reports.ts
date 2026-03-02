import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { reportsTable, listingsTable, profileReviewsTable } from '../db/schemas';
import { user } from '../db/auth-schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/rbac';

export const reportsRoutes = new Elysia({ prefix: '/reports' })
	.use(authMiddleware)
	.post(
		'/',
		async ({ body, session, set }) => {
			if (!session?.user) {
				set.status = 401;
				return { success: false, error: 'Unauthorized' };
			}

			if (session.ban) {
				set.status = 403;
				return { success: false, error: 'You are banned from performing this action', ban: session.ban };
			}

			if (!session.permissions.includes('report:create')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				const { target_type, target_id, reason } = body;

				// Prevent self-reporting
				if (target_type === 'user' && target_id === session.user.id) {
					set.status = 400;
					return { success: false, error: 'You cannot report yourself' };
				}

				// Validate target exists and prevent reporting own content
				if (target_type === 'listing') {
					const [listing] = await db
						.select({ id: listingsTable.id, author_id: listingsTable.author_id })
						.from(listingsTable)
						.where(eq(listingsTable.id, target_id));
					if (!listing) {
						set.status = 404;
						return { success: false, error: 'Listing not found' };
					}
					if (listing.author_id === session.user.id) {
						set.status = 400;
						return { success: false, error: 'You cannot report your own listing' };
					}
				} else if (target_type === 'review') {
					const [review] = await db
						.select({ id: profileReviewsTable.id, voter_user_id: profileReviewsTable.voter_user_id })
						.from(profileReviewsTable)
						.where(eq(profileReviewsTable.id, target_id));
					if (!review) {
						set.status = 404;
						return { success: false, error: 'Review not found' };
					}
					if (review.voter_user_id === session.user.id) {
						set.status = 400;
						return { success: false, error: 'You cannot report your own review' };
					}
				} else if (target_type === 'user') {
					const [targetUser] = await db
						.select({ id: user.id })
						.from(user)
						.where(eq(user.id, target_id));
					if (!targetUser) {
						set.status = 404;
						return { success: false, error: 'User not found' };
					}
				}

				// Check for duplicate pending report from same user on same target
				const existingReport = await db
					.select({ id: reportsTable.id })
					.from(reportsTable)
					.where(
						and(
							eq(reportsTable.reporter_id, session.user.id),
							eq(reportsTable.target_type, target_type),
							eq(reportsTable.target_id, target_id),
							eq(reportsTable.status, 'pending')
						)
					);

				if (existingReport.length > 0) {
					set.status = 400;
					return { success: false, error: 'You already have a pending report for this content' };
				}

				const [report] = await db
					.insert(reportsTable)
					.values({
						reporter_id: session.user.id,
						target_type,
						target_id,
						reason,
					})
					.returning();

				return {
					success: true,
					data: {
						...report,
						created_at: report.created_at.toISOString(),
						resolved_at: report.resolved_at?.toISOString() ?? null,
					},
				};
			} catch (err: any) {
				console.error('Create report error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			body: t.Object({
				target_type: t.Union([t.Literal('listing'), t.Literal('review'), t.Literal('user')]),
				target_id: t.String(),
				reason: t.String({ minLength: 1 }),
			})
		}
	);
