import { redirect } from '@sveltejs/kit';
import { apiFetch, getSessionCookie } from '$lib/api/fetch';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const auth = getSessionCookie(cookies);

	if (auth) {
		try {
			const res = await apiFetch('/api/auth/get-session', {
				headers: auth.header
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
