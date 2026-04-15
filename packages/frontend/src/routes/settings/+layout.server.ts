import { redirect } from '@sveltejs/kit';
import { apiFetch, getSessionCookie } from '$lib/api/fetch';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const auth = getSessionCookie(cookies);

	if (!auth) {
		redirect(302, '/login');
	}

	try {
		const res = await apiFetch('/api/auth/get-session', {
			headers: auth.header
		});
		const data = await res.json();

		if (!data.user) {
			redirect(302, '/login');
		}

		if (data.hasProfile === false) {
			redirect(302, '/onboarding');
		}

		return { session: data };
	} catch {
		redirect(302, '/login');
	}
};
