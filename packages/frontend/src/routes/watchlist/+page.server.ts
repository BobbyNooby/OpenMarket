import { redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/api/fetch';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const cookie = request.headers.get('cookie') || '';

	const sessionRes = await apiFetch('/api/auth/get-session', {
		headers: { cookie },
	});
	const session = await sessionRes.json();
	if (!session?.user) throw redirect(302, '/');

	const res = await apiFetch('/watchlist', { headers: { cookie } });
	const json = await res.json().catch(() => ({ success: false, data: [] }));
	const listings = json?.success ? json.data : [];

	return { listings, session };
};
