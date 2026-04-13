import { redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/api/fetch';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionToken = cookies.get('better-auth.session_token');

	if (sessionToken) {
		try {
			const res = await apiFetch('/api/auth/get-session', {
				headers: { Cookie: `better-auth.session_token=${sessionToken}` }
			});
			const data = await res.json();

			if (data.user && data.hasProfile !== false) {
				redirect(302, '/');
			}
			if (data.user && data.hasProfile === false) {
				redirect(302, '/onboarding');
			}
		} catch {
			// Not logged in or error
		}
	}

	return {};
};
