import type { LayoutServerLoad } from './$types';
import { THEME_MAP } from '$lib/design/themes';
import { auth } from '$lib/auth/auth';

export const load: LayoutServerLoad = async ({ locals, request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	console.log('Current session', session);

	const theme = THEME_MAP[locals.themeName ?? 'dark'];
	return {
		theme,
		session
	};
};
