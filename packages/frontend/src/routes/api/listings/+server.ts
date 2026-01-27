import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { api } from '$lib/api/server';

export const GET: RequestHandler = async ({ url }) => {
	const limit = url.searchParams.get('limit') || '20';
	const offset = url.searchParams.get('offset') || '0';

	const result = await api.listings.get({ query: { limit, offset } });

	if (result.data?.success) {
		return json(result.data);
	}

	return json({ success: false, error: result.data?.error || 'Failed to fetch listings' }, { status: 500 });
};
