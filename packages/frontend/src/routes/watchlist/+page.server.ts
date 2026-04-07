import { redirect } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const cookie = request.headers.get('cookie') || '';

	// Check auth via session
	const sessionRes = await fetch(`${PUBLIC_API_URL}/api/auth/get-session`, {
		headers: { cookie },
	});
	const session = await sessionRes.json();
	if (!session?.user) throw redirect(302, '/');

	const res = await fetch(`${PUBLIC_API_URL}/watchlist`, { headers: { cookie } });
	const json = await res.json().catch(() => ({ success: false, data: [] }));
	const listings = json?.success ? json.data : [];

	return { listings, session };
};
