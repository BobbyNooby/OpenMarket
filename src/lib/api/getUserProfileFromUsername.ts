import { db } from '$lib/db/db';
import { usersTable, usersActivityTable, profileReviewsTable } from '$lib/db/schemas';
import type { UserPageProfile, ProfileReview } from '$lib/types';
import { eq } from 'drizzle-orm';

export async function getUserProfileFromUsername(
	username: string
): Promise<{ status: number; data: UserPageProfile | null; error?: any }> {
	try {
		// 1. fetch user + activity
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
			.where(eq(usersTable.username, username));

		if (userRows.length === 0) {
			return { status: 404, data: null };
		}

		const userRow = userRows[0];

		// 2. fetch profile reviews for this user
		const reviewRows = await db
			.select()
			.from(profileReviewsTable)
			.where(eq(profileReviewsTable.profile_user_id, userRow.id));

		// map reviews into your ProfileReview type
		const reviews: ProfileReview[] = reviewRows.map((r) => ({
			id: r.id,
			created_at: r.created_at.toISOString(),
			type: r.type,
			profile_user_id: r.profile_user_id,
			voter_id: r.voter_user_id,
			comment: r.comment ?? undefined
		}));

		// 3. merge into UserPageProfile
		const returnObject: UserPageProfile = {
			id: userRow.id,
			created_at: userRow.created_at.toISOString(),
			discord_id: userRow.discord_id,
			username: userRow.username,
			display_name: userRow.display_name,
			avatar_url: userRow.avatar_url ?? undefined,
			description: userRow.description ?? undefined,
			is_active: userRow.is_active ?? false,
			last_activity_at: userRow.last_activity_at?.toISOString()! ?? undefined,
			reviews
		};

		return { status: 200, data: returnObject };
	} catch (err: any) {
		return { status: 500, data: null, error: err };
	}
}
