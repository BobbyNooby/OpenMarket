import { updateUserOnSessionRequest } from '$lib/api/updateUserOnSessionRequest';
import type { usersTable } from '$lib/db/schemas';
import type { LayoutServerLoad } from './$types';
import { THEME_MAP } from '$lib/design/themes';

export const load: LayoutServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (session) {
		const { discord_id, username, display_name, avatar_url } = session as {
			discord_id: string;
			username: string;
			display_name: string;
			avatar_url: string;
		};
		const user: typeof usersTable.$inferInsert = {
			discord_id,
			username,
			display_name,
			avatar_url
		};
		console.log(await updateUserOnSessionRequest(user));
	}
	const theme = THEME_MAP[locals.themeName ?? 'dark'];
	return {
		theme,
		session
	};
};
