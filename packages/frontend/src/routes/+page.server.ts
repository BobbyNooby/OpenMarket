import type { PageServerLoad } from './$types';
import { api } from '$lib/api/server';

export const load: PageServerLoad = async () => {
	const limit = 12;
	const [listingsResult, itemsResult, currenciesResult] = await Promise.all([
		api.listings.get({ query: { limit: String(limit), offset: '0' } }),
		api.items.get(),
		api.currencies.get()
	]);

	if (!listingsResult.data?.success) {
		return {
			listings: [],
			pagination: null,
			items: itemsResult.data?.success ? itemsResult.data.data : [],
			currencies: currenciesResult.data?.success ? currenciesResult.data.data : [],
			error: listingsResult.data?.error || 'Failed to fetch listings'
		};
	}

	return {
		listings: listingsResult.data.data,
		pagination: listingsResult.data.pagination,
		items: itemsResult.data?.success ? itemsResult.data.data : [],
		currencies: currenciesResult.data?.success ? currenciesResult.data.data : []
	};
};
