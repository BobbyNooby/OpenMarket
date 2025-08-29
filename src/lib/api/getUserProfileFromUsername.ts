import { db } from '$lib/db/db';
import { usersTable, usersActivityTable } from '$lib/db/schemas';
import type { UserPageProfile } from '$lib/types';
import { eq } from 'drizzle-orm';

export async function getUserProfileFromUsername(
	username: string
): Promise<{ status: number; data: UserPageProfile | null; error?: any }> {
	try {
		const result = await db
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

		const returnObject: UserPageProfile = {
			id: result[0].id.toString(),
			created_at: result[0].created_at.toISOString(),
			discord_id: result[0].discord_id,
			username: result[0].username,
			display_name: result[0].display_name,
			avatar_url: result[0].avatar_url || undefined,
			description: result[0].description || undefined,
			is_active: result[0].is_active!,
			last_activity_at: result[0].last_activity_at?.toISOString()!
		};
		// return first match, or null
		return {
			status: result.length > 0 ? 200 : 404,
			data: result.length > 0 ? returnObject : null
		};
	} catch (err: any) {
		return {
			status: 500,
			data: null,
			error: err
		};
	}
}
