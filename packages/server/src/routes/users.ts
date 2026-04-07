import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { user, userProfilesTable, usersActivityTable, profileReviewsTable, listingsTable, tradesTable } from '../db/schemas';
import { eq, and, ne, desc, ilike, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { authMiddleware } from '../middleware/rbac';
import { createNotification } from '../services/notifications';
import { trackEvent } from '../services/analytics';

export const usersRoutes = new Elysia({ prefix: '/users' })
	.use(authMiddleware)

	// Create or update user profile (called after OAuth login)
	.post(
		'/profile',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			try {
				const userId = session.user.id;
				const result = await db.transaction(async (tx) => {
					// Upsert user profile
					const [profile] = await tx
						.insert(userProfilesTable)
						.values({
							userId,
							username: body.username,
							description: body.description
						})
						.onConflictDoUpdate({
							target: userProfilesTable.userId,
							set: {
								username: body.username,
								description: body.description
							}
						})
						.returning();

					// Update activity
					await tx
						.insert(usersActivityTable)
						.values({
							user_id: userId,
							is_active: true,
							last_activity_at: new Date()
						})
						.onConflictDoUpdate({
							target: usersActivityTable.user_id,
							set: {
								is_active: true,
								last_activity_at: new Date()
							}
						});

					return profile;
				});

				console.log(`User profile upserted: ${result.userId} (${result.username})`);
				return { success: true, data: result };
			} catch (err: any) {
				console.error('User profile upsert error:', err);
				const message = typeof err?.message === 'string' ? err.message : 'Unknown error';
				const isConflict = /unique|constraint|conflict/i.test(message);
				return {
					success: false,
					error: message,
					status: isConflict ? 409 : 500
				};
			}
		},
		{
			body: t.Object({
				username: t.String(),
				description: t.Optional(t.String())
			})
		}
	)
	// Search users by username or display name
	.get(
		'/search',
		async ({ query, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			const q = query.q?.trim();
			if (!q || q.length < 2) return { success: true, data: [] };

			const results = await db
				.select({
					id: user.id,
					name: user.name,
					image: user.image,
					username: userProfilesTable.username,
				})
				.from(user)
				.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
				.where(
					and(
						ne(user.id, session.user.id),
						or(
							ilike(userProfilesTable.username, `%${q}%`),
							ilike(user.name, `%${q}%`),
						),
					),
				)
				.limit(10);

			return {
				success: true,
				data: results.map((r) => ({
					id: r.id,
					username: r.username,
					display_name: r.name,
					avatar: r.image,
				})),
			};
		},
		{
			query: t.Object({
				q: t.Optional(t.String()),
			}),
		},
	)
	// Get user profile by username
	.get(
		'/profile/:username',
		async ({ params }) => {
			try {
				const userRows = await db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
						image: user.image,
						createdAt: user.createdAt,
						username: userProfilesTable.username,
						description: userProfilesTable.description,
						is_active: usersActivityTable.is_active,
						last_activity_at: usersActivityTable.last_activity_at
					})
					.from(user)
					.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.leftJoin(usersActivityTable, eq(user.id, usersActivityTable.user_id))
					.where(eq(userProfilesTable.username, params.username));

				if (userRows.length === 0) {
					return { success: false, error: 'User not found', status: 404 };
				}

				const userRow = userRows[0];

				// Fetch listing counts by status
				const listingCounts = await db
					.select({
						status: listingsTable.status,
						count: sql<number>`count(*)::int`,
					})
					.from(listingsTable)
					.where(eq(listingsTable.author_id, userRow.id))
					.groupBy(listingsTable.status);

				const listingStats = {
					active: 0, paused: 0, expired: 0, total: 0,
				};
				for (const row of listingCounts) {
					listingStats[row.status as keyof typeof listingStats] = row.count;
					listingStats.total += row.count;
				}

				// Fetch trade count
				const [tradeCountResult] = await db
					.select({ count: sql<number>`count(*)::int` })
					.from(tradesTable)
					.where(
						or(
							eq(tradesTable.seller_id, userRow.id),
							eq(tradesTable.buyer_id, userRow.id),
						)
					);
				const tradeCount = tradeCountResult?.count ?? 0;

				// Fetch profile reviews with voter info
				const reviewRows = await db
					.select({
						id: profileReviewsTable.id,
						created_at: profileReviewsTable.created_at,
						type: profileReviewsTable.type,
						profile_user_id: profileReviewsTable.profile_user_id,
						voter_user_id: profileReviewsTable.voter_user_id,
						comment: profileReviewsTable.comment,
						voter: {
							id: user.id,
							name: user.name,
							image: user.image,
							createdAt: user.createdAt
						},
						voterProfile: {
							username: userProfilesTable.username,
							description: userProfilesTable.description
						}
					})
					.from(profileReviewsTable)
					.innerJoin(user, eq(profileReviewsTable.voter_user_id, user.id))
					.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.where(eq(profileReviewsTable.profile_user_id, userRow.id))
					.orderBy(desc(profileReviewsTable.created_at));

				const reviews = reviewRows.map((r) => ({
					id: r.id,
					created_at: r.created_at.toISOString(),
					type: r.type,
					profile_user_id: r.profile_user_id,
					voter_id: r.voter_user_id,
					comment: r.comment ?? undefined,
					voter: {
						id: r.voter.id,
						username: r.voterProfile.username,
						display_name: r.voter.name,
						avatar_url: r.voter.image ?? undefined,
						description: r.voterProfile.description ?? undefined,
						created_at: r.voter.createdAt.toISOString()
					}
				}));

				// Calculate trust score
				const upvoteCount = reviews.filter(r => r.type === 'upvote').length;
				const totalReviewCount = reviews.length;
				const upvoteRatio = totalReviewCount > 0 ? upvoteCount / totalReviewCount : 0.5;
				const accountAgeDays = (Date.now() - new Date(userRow.createdAt).getTime()) / (1000 * 60 * 60 * 24);
				const ageFactor = Math.min(accountAgeDays / 365, 1);
				const tradeFactor = listingStats.total > 0 ? Math.min(tradeCount / listingStats.total, 1) : 0;
				const trustScore = Math.min(Math.round(
					(upvoteRatio * 40) + (ageFactor * 30) + (tradeFactor * 30)
				), 100);

				return {
					success: true,
					data: {
						id: userRow.id,
						created_at: userRow.createdAt.toISOString(),
						username: userRow.username,
						display_name: userRow.name,
						avatar_url: userRow.image ?? undefined,
						description: userRow.description ?? undefined,
						is_active: userRow.is_active ?? false,
						last_activity_at: userRow.last_activity_at?.toISOString() ?? undefined,
						listing_stats: listingStats,
						trade_count: tradeCount,
						trust_score: trustScore,
						reviews
					}
				};
			} catch (err: any) {
				console.error('Get profile error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				username: t.String()
			})
		}
	)
	// Submit a review for a user profile
	.post(
		'/profile/:username/reviews',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('review:create')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				// Get the profile being reviewed
				const profileRows = await db
					.select({
						id: user.id,
						username: userProfilesTable.username
					})
					.from(user)
					.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.where(eq(userProfilesTable.username, params.username));

				if (profileRows.length === 0) {
					return { success: false, error: 'User not found', status: 404 };
				}

				const profileUser = profileRows[0];

				// Check if user is trying to review themselves
				if (profileUser.id === session.user!.id) {
					return { success: false, error: 'You cannot review yourself', status: 400 };
				}

				// Check if user has already reviewed this profile
				const existingReview = await db
					.select({ id: profileReviewsTable.id })
					.from(profileReviewsTable)
					.where(
						and(
							eq(profileReviewsTable.profile_user_id, profileUser.id),
							eq(profileReviewsTable.voter_user_id, session.user!.id)
						)
					);

				if (existingReview.length > 0) {
					// Update existing review
					const [updated] = await db
						.update(profileReviewsTable)
						.set({
							type: body.type,
							comment: body.comment || null
						})
						.where(eq(profileReviewsTable.id, existingReview[0].id))
						.returning();

					return { success: true, data: updated, updated: true };
				}

				// Create new review
				const [review] = await db
					.insert(profileReviewsTable)
					.values({
						profile_user_id: profileUser.id,
						voter_user_id: session.user!.id,
						type: body.type,
						comment: body.comment || null
					})
					.returning();

				createNotification({
					userId: profileUser.id,
					type: "new_review",
					title: `${session.user!.name} left a ${body.type} on your profile`,
					body: body.comment || undefined,
					link: `/profile/${profileUser.username}`,
				});

				trackEvent({ type: "review_submitted", userId: session.user!.id, metadata: { target_user_id: profileUser.id, type: body.type } });
				return { success: true, data: review, updated: false };
			} catch (err: any) {
				console.error('Submit review error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				username: t.String()
			}),
			body: t.Object({
				type: t.Union([t.Literal('upvote'), t.Literal('downvote')]),
				comment: t.Optional(t.String())
			})
		}
	)
	// Get authenticated user's trade history
	.get(
		'/trades',
		async ({ query, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
			const offset = Math.max(Number(query.offset) || 0, 0);
			const userId = session.user.id;

			try {
				const sellerUser = alias(user, 'seller_user');
				const buyerUser = alias(user, 'buyer_user');
				const sellerProfile = alias(userProfilesTable, 'seller_profile');
				const buyerProfile = alias(userProfilesTable, 'buyer_profile');

				// Get total count
				const [totalResult] = await db
					.select({ count: sql<number>`count(*)::int` })
					.from(tradesTable)
					.where(or(eq(tradesTable.seller_id, userId), eq(tradesTable.buyer_id, userId)));

				const total = totalResult?.count ?? 0;

				// Fetch trades with seller/buyer info
				const trades = await db
					.select({
						id: tradesTable.id,
						listing_snapshot: tradesTable.listing_snapshot,
						completed_at: tradesTable.completed_at,
						seller_id: tradesTable.seller_id,
						buyer_id: tradesTable.buyer_id,
						seller_name: sellerUser.name,
						seller_image: sellerUser.image,
						seller_username: sellerProfile.username,
						buyer_name: buyerUser.name,
						buyer_image: buyerUser.image,
						buyer_username: buyerProfile.username,
					})
					.from(tradesTable)
					.innerJoin(sellerUser, eq(tradesTable.seller_id, sellerUser.id))
					.innerJoin(sellerProfile, eq(sellerUser.id, sellerProfile.userId))
					.leftJoin(buyerUser, eq(tradesTable.buyer_id, buyerUser.id))
					.leftJoin(buyerProfile, eq(buyerUser.id, buyerProfile.userId))
					.where(or(eq(tradesTable.seller_id, userId), eq(tradesTable.buyer_id, userId)))
					.orderBy(desc(tradesTable.completed_at))
					.limit(limit)
					.offset(offset);

				const data = trades.map((t) => ({
					id: t.id,
					listing_snapshot: JSON.parse(t.listing_snapshot),
					completed_at: t.completed_at.toISOString(),
					seller: {
						id: t.seller_id,
						username: t.seller_username,
						display_name: t.seller_name,
						avatar: t.seller_image,
					},
					buyer: t.buyer_id ? {
						id: t.buyer_id,
						username: t.buyer_username,
						display_name: t.buyer_name,
						avatar: t.buyer_image,
					} : null,
					role: t.seller_id === userId ? 'seller' as const : 'buyer' as const,
				}));

				return {
					success: true,
					data,
					pagination: { total, limit, offset, hasMore: offset + limit < total },
				};
			} catch (err: any) {
				console.error('Get trades error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
		},
	)
	// Get user by ID
	.get(
		'/:id',
		async ({ params }) => {
			try {
				const [result] = await db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
						image: user.image,
						createdAt: user.createdAt,
						username: userProfilesTable.username,
						description: userProfilesTable.description
					})
					.from(user)
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.where(eq(user.id, params.id));

				if (!result) {
					return { success: false, error: 'User not found', status: 404 };
				}

				return {
					success: true,
					data: {
						id: result.id,
						created_at: result.createdAt.toISOString(),
						username: result.username ?? result.name,
						display_name: result.name,
						avatar_url: result.image ?? undefined,
						description: result.description ?? undefined
					}
				};
			} catch (err: any) {
				console.error('Get user error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	);
