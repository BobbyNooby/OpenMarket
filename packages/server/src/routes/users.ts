import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { user, userProfilesTable, usersActivityTable, profileReviewsTable, listingsTable, tradesTable, account } from '../db/schemas';
import { userRolesTable } from '../db/rbac-schema';
import { eq, and, ne, desc, ilike, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { authMiddleware } from '../middleware/rbac';
import { createNotification } from '../services/notifications';
import { trackEvent } from '../services/analytics';
import { validateUsername } from '../utils/username';

export const usersRoutes = new Elysia({ prefix: '/users' })
	.use(authMiddleware)

	// Create or update user profile (called after OAuth login and from settings)
	.post(
		'/profile',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			const validation = validateUsername(body.username);
			if (!validation.valid) {
				set.status =  400;
				return { success: false, error: validation.error ?? 'Invalid username' };
			}

			// Validate accent color (hex)
			if (body.accent_color && !/^#[0-9a-fA-F]{6}$/.test(body.accent_color)) {
				set.status = 400;
				return { success: false, error: 'Accent color must be a hex code like #aabbcc' };
			}

			// Validate JSON fields upfront so we return a clean 400 on bad payloads
			if (body.social_links !== undefined) {
				try { JSON.parse(body.social_links); } catch {
					set.status = 400;
					return { success: false, error: 'social_links must be valid JSON' };
				}
			}
			if (body.notification_preferences !== undefined) {
				try { JSON.parse(body.notification_preferences); } catch {
					set.status = 400;
					return { success: false, error: 'notification_preferences must be valid JSON' };
				}
			}

			try {
				const userId = session.user.id;
				const result = await db.transaction(async (tx) => {
					// Upsert user profile
					const [profile] = await tx
						.insert(userProfilesTable)
						.values({
							userId,
							username: body.username,
							description: body.description,
							bio: body.bio,
							social_links: body.social_links,
							accent_color: body.accent_color,
							avatar_url: body.avatar_url,
							notification_preferences: body.notification_preferences ?? '{}',
						})
						.onConflictDoUpdate({
							target: userProfilesTable.userId,
							set: {
								username: body.username,
								description: body.description,
								bio: body.bio,
								social_links: body.social_links,
								accent_color: body.accent_color,
								// only overwrite avatar/prefs if the caller sent them
								...(body.avatar_url !== undefined
									? { avatar_url: body.avatar_url }
									: {}),
								...(body.notification_preferences !== undefined
									? { notification_preferences: body.notification_preferences }
									: {}),
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
					error: isConflict ? 'That username is already taken' : message,
					status: isConflict ? 409 : 500
				};
			}
		},
		{
			body: t.Object({
				username: t.String(),
				description: t.Optional(t.String()),
				bio: t.Optional(t.String()),
				social_links: t.Optional(t.String()),
				accent_color: t.Optional(t.String()),
				avatar_url: t.Optional(t.String()),
				notification_preferences: t.Optional(t.String()),
			})
		}
	)
	// Update only the notification preferences for the authenticated user
	.put(
		'/notification-preferences',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			// Validate JSON shape upfront
			try { JSON.parse(body.notification_preferences); } catch {
				set.status = 400;
				return { success: false, error: 'notification_preferences must be valid JSON' };
			}

			try {
				const result = await db
					.update(userProfilesTable)
					.set({ notification_preferences: body.notification_preferences })
					.where(eq(userProfilesTable.userId, session.user.id))
					.returning({ userId: userProfilesTable.userId });

				if (result.length === 0) {
					set.status = 404;
					return { success: false, error: 'Profile not found' };
				}

				return { success: true };
			} catch (err: any) {
				console.error('Notification preferences update error:', err);
				set.status = 500;
				return { success: false, error: err?.message ?? 'Unknown error' };
			}
		},
		{
			body: t.Object({
				notification_preferences: t.String(),
			}),
		},
	)
	// Update only the language preference for the authenticated user
	.put(
		'/language',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			// Whitelist supported locales — keep in sync with project.inlang/settings.json
			const SUPPORTED_LOCALES = new Set(['en', 'es', 'fr', 'ja']);
			if (!SUPPORTED_LOCALES.has(body.language)) {
				set.status = 400;
				return { success: false, error: 'Unsupported language' };
			}

			try {
				const result = await db
					.update(userProfilesTable)
					.set({ language: body.language })
					.where(eq(userProfilesTable.userId, session.user.id))
					.returning({ userId: userProfilesTable.userId });

				if (result.length === 0) {
					set.status = 404;
					return { success: false, error: 'Profile not found' };
				}

				return { success: true };
			} catch (err: any) {
				console.error('Language update error:', err);
				set.status = 500;
				return { success: false, error: err?.message ?? 'Unknown error' };
			}
		},
		{
			body: t.Object({
				language: t.String(),
			}),
		},
	)
	// Check if a username is available (used by settings + future registration flow)
	.get(
		'/username-available',
		async ({ query, session }) => {
			const username = (query.username ?? '').trim().toLowerCase();
			const validation = validateUsername(username);
			if (!validation.valid) {
				return { success: true, available: false, reason: validation.error };
			}

			const existing = await db
				.select({ userId: userProfilesTable.userId })
				.from(userProfilesTable)
				.where(eq(userProfilesTable.username, username))
				.limit(1);

			// Own username counts as available (lets users re-save the form)
			if (existing.length > 0 && existing[0].userId !== session?.user?.id) {
				return { success: true, available: false, reason: 'Username is already taken' };
			}

			return { success: true, available: true };
		},
		{
			query: t.Object({
				username: t.String(),
			}),
		},
	)
	// Complete onboarding — called after a user first signs in to create their marketplace profile
	.post(
		'/complete-onboarding',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			// Reject if the user already has a profile (onboarding is one-shot)
			const [existing] = await db
				.select({ userId: userProfilesTable.userId })
				.from(userProfilesTable)
				.where(eq(userProfilesTable.userId, session.user.id));
			if (existing) {
				set.status = 409;
				return { success: false, error: 'Profile already exists' };
			}

			const username = body.username.trim().toLowerCase();
			const validation = validateUsername(username);
			if (!validation.valid) {
				set.status = 400;
				return { success: false, error: validation.error ?? 'Invalid username' };
			}

			try {
				await db.transaction(async (tx) => {
					await tx.insert(userProfilesTable).values({
						userId: session.user!.id,
						username,
					});
					await tx
						.insert(usersActivityTable)
						.values({
							user_id: session.user!.id,
							is_active: true,
							last_activity_at: new Date(),
						})
						.onConflictDoNothing();
					await tx
						.insert(userRolesTable)
						.values({
							userId: session.user!.id,
							roleId: 'user',
						})
						.onConflictDoNothing();
				});

				console.log(`Onboarding complete: ${session.user.id} (${username})`);
				return { success: true };
			} catch (err: any) {
				const message = typeof err?.message === 'string' ? err.message : 'Unknown error';
				const isConflict = /unique|constraint|conflict/i.test(message);
				console.error('Onboarding error:', err);
				set.status = isConflict ? 409 : 500;
				return {
					success: false,
					error: isConflict ? 'That username is already taken' : message,
				};
			}
		},
		{
			body: t.Object({
				username: t.String(),
			}),
		},
	)
	// List the linked auth providers for the authenticated user
	.get(
		'/accounts',
		async ({ session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			const rows = await db
				.select({
					provider_id: account.providerId,
					created_at: account.createdAt,
				})
				.from(account)
				.where(eq(account.userId, session.user.id));

			return {
				success: true,
				data: rows.map((r) => ({
					provider: r.provider_id,
					linked_at: r.created_at.toISOString(),
				})),
			};
		},
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
						bio: userProfilesTable.bio,
						social_links: userProfilesTable.social_links,
						accent_color: userProfilesTable.accent_color,
						avatar_url: userProfilesTable.avatar_url,
						notification_preferences: userProfilesTable.notification_preferences,
						language: userProfilesTable.language,
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

				// Parse JSON fields — fall back to safe defaults on corruption
				let socialLinks: Record<string, string> = {};
				if (userRow.social_links) {
					try {
						const parsed = JSON.parse(userRow.social_links);
						if (parsed && typeof parsed === 'object') socialLinks = parsed;
					} catch { /* ignore */ }
				}

				return {
					success: true,
					data: {
						id: userRow.id,
						created_at: userRow.createdAt.toISOString(),
						username: userRow.username,
						display_name: userRow.name,
						avatar_url: userRow.avatar_url || userRow.image || undefined,
						description: userRow.description ?? undefined,
						bio: userRow.bio ?? undefined,
						social_links: socialLinks,
						accent_color: userRow.accent_color ?? undefined,
						notification_preferences: userRow.notification_preferences ?? '{}',
					language: userRow.language ?? 'en',
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