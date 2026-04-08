import { error } from '@sveltejs/kit';
import { api } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, request, parent }) => {
	const { session } = await parent();
	const cookie = request.headers.get('cookie') || '';
	const headers = { cookie };

	const result = await api.listings({ id: params.id }).get({ headers });
	if (!result.data?.success || !result.data.data) {
		throw error(404, 'Listing not found');
	}

	return { session, listing: result.data.data };
};
