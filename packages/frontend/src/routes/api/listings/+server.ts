import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { api } from '$lib/api/server';

export const GET: RequestHandler = async ({ url }) => {
	// Forward all query params to the backend
	const query: Record<string, string> = {};
	for (const [key, value] of url.searchParams.entries()) {
		query[key] = value;
	}
	if (!query.limit) query.limit = '20';
	if (!query.offset) query.offset = '0';

	const result = await api.listings.get({ query });

	if (result.data?.success) {
		return json(result.data);
	}

	return json({ success: false, error: result.data?.error || 'Failed to fetch listings' }, { status: 500 });
};
