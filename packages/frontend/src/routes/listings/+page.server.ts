import type { PageServerLoad } from './$types';
import { api } from '$lib/api/client';

export const load: PageServerLoad = async () => {
	const limit = 20;
	const [listingsResult, itemsResult, currenciesResult] = await Promise.all([
		api.listings.get({ query: { limit: String(limit), offset: '0' } }),
		api.items.get(),
		api.currencies.get()
	]);

	return {
		listings: listingsResult.data?.success ? listingsResult.data.data : [],
		pagination: listingsResult.data?.success ? listingsResult.data.pagination : null,
		items: itemsResult.data?.success ? itemsResult.data.data : [],
		currencies: currenciesResult.data?.success ? currenciesResult.data.data : []
	};
};
