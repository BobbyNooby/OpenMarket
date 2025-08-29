import { db } from '$lib/db/db';
import { usersTable, usersActivityTable } from '$lib/db/schemas';

type UserInsert = typeof usersTable.$inferInsert;

type UpsertedUser = { id: number; username: string };

type UpsertResult = { status: 200; data: UpsertedUser } | { status: number; error: string };

export async function updateUserOnSessionRequest(user: UserInsert): Promise<UpsertResult> {
	try {
		const updated: UpsertedUser = await db.transaction(async (tx) => {
			const [u] = await tx
				.insert(usersTable)
				.values({
					discord_id: user.discord_id,
					username: user.username,
					display_name: user.display_name,
					avatar_url: user.avatar_url,
					description: user.description
				})
				.onConflictDoUpdate({
					target: usersTable.discord_id,
					set: {
						username: user.username,
						display_name: user.display_name,
						avatar_url: user.avatar_url,
						description: user.description
					}
				})
				.returning({
					id: usersTable.id,
					username: usersTable.username
				});

			await tx
				.insert(usersActivityTable)
				.values({
					user_id: u.id,
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

			return u; // satisfies UpsertedUser
		});

		console.log(`user of id : ${updated.id} and username : ${updated.username} updated`);
		return { status: 200, data: updated };
	} catch (err: any) {
		console.error('updateUserOnSessionRequest error:', err);
		const message = typeof err?.message === 'string' ? err.message : 'Unknown error';
		const status = /unique|constraint|conflict/i.test(message) ? 409 : 500;
		return { status, error: message };
	}
}
