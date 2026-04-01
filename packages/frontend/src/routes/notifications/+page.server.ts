import type { PageServerLoad } from './$types';
import { api } from '$lib/api/server';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ request }) => {
	const cookie = request.headers.get('cookie') || '';

	const sessionRes = await api['api']['auth']['get-session'].get({
		headers: { cookie }
	});

	if (!sessionRes.data?.user) {
		throw redirect(302, '/');
	}

	return {};
};
