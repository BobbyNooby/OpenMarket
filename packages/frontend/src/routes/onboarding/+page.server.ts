import { redirect } from '@sveltejs/kit';
import { apiFetch, getSessionCookie } from '$lib/api/fetch';

export const load = async ({ cookies }) => {
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

		if (data.hasProfile === true) {
			redirect(302, '/');
		}

		return { user: data.user };
	} catch {
		redirect(302, '/login');
	}
};
