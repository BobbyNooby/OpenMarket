import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { usersTable, usersActivityTable, profileReviewsTable } from '../db/schemas';
import { eq } from 'drizzle-orm';

export const usersRoutes = new Elysia({ prefix: '/users' })
	// Upsert user on session (called on login)
	.post(
		'/upsert',
		async ({ body }) => {
			try {
				const result = await db.transaction(async (tx) => {
					const [user] = await tx
						.insert(usersTable)
						.values({
							discord_id: body.discord_id,
							username: body.username,
							display_name: body.display_name,
							avatar_url: body.avatar_url,
							description: body.description
						})
						.onConflictDoUpdate({
							target: usersTable.discord_id,
							set: {
								username: body.username,
								display_name: body.display_name,
								avatar_url: body.avatar_url,
								description: body.description
							}
						})
						.returning({
							id: usersTable.id,
							username: usersTable.username
						});

					await tx
						.insert(usersActivityTable)
						.values({
							user_id: user.id,
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

					return user;
				});

				console.log(`User upserted: ${result.id} (${result.username})`);
				return { success: true, data: result };
			} catch (err: any) {
				console.error('User upsert error:', err);
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
				discord_id: t.String(),
				username: t.String(),
				display_name: t.String(),
				avatar_url: t.Optional(t.String()),
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
						id: usersTable.id,
						created_at: usersTable.created_at,
						discord_id: usersTable.discord_id,
						username: usersTable.username,
						display_name: usersTable.display_name,
						avatar_url: usersTable.avatar_url,
						description: usersTable.description,
						is_active: usersActivityTable.is_active,
						last_activity_at: usersActivityTable.last_activity_at
					})
					.from(usersTable)
					.leftJoin(usersActivityTable, eq(usersTable.id, usersActivityTable.user_id))
					.where(eq(usersTable.username, params.username));

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
							id: usersTable.id,
							discord_id: usersTable.discord_id,
							username: usersTable.username,
							display_name: usersTable.display_name,
							avatar_url: usersTable.avatar_url,
							description: usersTable.description,
							created_at: usersTable.created_at
						}
					})
					.from(profileReviewsTable)
					.innerJoin(usersTable, eq(profileReviewsTable.voter_user_id, usersTable.id))
					.where(eq(profileReviewsTable.profile_user_id, userRow.id));

				const reviews = reviewRows.map((r) => ({
					id: r.id,
					created_at: r.created_at.toISOString(),
					type: r.type,
					profile_user_id: r.profile_user_id,
					voter_id: r.voter_user_id,
					comment: r.comment ?? undefined,
					voter: {
						id: r.voter.id,
						discord_id: r.voter.discord_id,
						username: r.voter.username,
						display_name: r.voter.display_name,
						avatar_url: r.voter.avatar_url ?? undefined,
						description: r.voter.description ?? undefined,
						created_at: r.voter.created_at.toISOString()
					}
				}));

				return {
					success: true,
					data: {
						id: userRow.id,
						created_at: userRow.created_at.toISOString(),
						discord_id: userRow.discord_id,
						username: userRow.username,
						display_name: userRow.display_name,
						avatar_url: userRow.avatar_url ?? undefined,
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
	// Get user by ID
	.get(
		'/:id',
		async ({ params }) => {
			try {
				const [user] = await db
					.select()
					.from(usersTable)
					.where(eq(usersTable.id, params.id));

				if (!user) {
					return { success: false, error: 'User not found', status: 404 };
				}

				return { success: true, data: user };
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
