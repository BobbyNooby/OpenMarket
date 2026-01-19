import type { PageServerLoad } from './$types';
import { api } from '$lib/api/client';

export const load: PageServerLoad = async () => {
	const limit = 12;
	const listingsResult = await api.listings.get({ query: { limit: String(limit), offset: '0' } });

	if (!listingsResult.data?.success) {
		return {
			listings: [],
			pagination: null,
			error: listingsResult.data?.error || 'Failed to fetch listings'
		};
	}

	return {
		listings: listingsResult.data.data,
		pagination: listingsResult.data.pagination
	};
};
