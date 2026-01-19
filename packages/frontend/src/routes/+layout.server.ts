import type { LayoutServerLoad } from './$types';
import { THEME_MAP } from '$lib/design/themes';

export const load: LayoutServerLoad = async ({ locals, fetch, cookies }) => {
	const theme = THEME_MAP[locals.themeName ?? 'dark'];

	let session = null;
	try {
		const sessionToken = cookies.get('better-auth.session_token');
		const res = await fetch('http://localhost:3000/api/auth/get-session', {
			credentials: 'include',
			headers: sessionToken ? { Cookie: `better-auth.session_token=${sessionToken}` } : {}
		});

		if (res.ok) {
			const data = await res.json();
			if (data.session && data.user) {
				session = { ...data.session, user: data.user };
			}
		}
	} catch {
		// not logged in
	}

	return { theme, session };
};
