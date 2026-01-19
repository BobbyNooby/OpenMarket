import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { user, userProfilesTable, usersActivityTable, profileReviewsTable } from '../db/schemas';
import { eq, and, desc } from 'drizzle-orm';

export const usersRoutes = new Elysia({ prefix: '/users' })
	// Create or update user profile (called after OAuth login)
	.post(
		'/profile',
		async ({ body }) => {
			try {
				const result = await db.transaction(async (tx) => {
					// Upsert user profile
					const [profile] = await tx
						.insert(userProfilesTable)
						.values({
							userId: body.user_id,
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
							user_id: body.user_id,
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
				user_id: t.String(),
				username: t.String(),
				description: t.Optional(t.String())
			})
		}
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
		async ({ params, body }) => {
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
				if (profileUser.id === body.voter_user_id) {
					return { success: false, error: 'You cannot review yourself', status: 400 };
				}

				// Check if user has already reviewed this profile
				const existingReview = await db
					.select({ id: profileReviewsTable.id })
					.from(profileReviewsTable)
					.where(
						and(
							eq(profileReviewsTable.profile_user_id, profileUser.id),
							eq(profileReviewsTable.voter_user_id, body.voter_user_id)
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
						voter_user_id: body.voter_user_id,
						type: body.type,
						comment: body.comment || null
					})
					.returning();

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
				voter_user_id: t.String(),
				type: t.Union([t.Literal('upvote'), t.Literal('downvote')]),
				comment: t.Optional(t.String())
			})
		}
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
