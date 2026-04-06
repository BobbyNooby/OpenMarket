import type { PageServerLoad } from './$types';
import { api } from '$lib/api/server';

export const load: PageServerLoad = async ({ request }) => {
	const cookie = request.headers.get('cookie') || '';
	const limit = 12;

	const [listingsResult, itemsResult, currenciesResult, popularResult, trendingResult, recommendedResult] = await Promise.all([
		api.listings.get({ query: { limit: String(limit), offset: '0' } }),
		api.items.get(),
		api.currencies.get(),
		api.listings.popular.get().catch(() => ({ data: null })),
		api.listings.trending.get().catch(() => ({ data: null })),
		api.listings.recommended.get({ headers: { cookie } }).catch(() => ({ data: null }))
	]);

	const items = itemsResult.data?.success ? itemsResult.data.data : [];
	const currencies = currenciesResult.data?.success ? currenciesResult.data.data : [];

	if (!listingsResult.data?.success) {
		return {
			listings: [],
			pagination: null,
			items,
			currencies,
			popular: [],
			trending: [],
			recommended: [],
			error: listingsResult.data?.error || 'Failed to fetch listings'
		};
	}

	return {
		listings: listingsResult.data.data,
		pagination: listingsResult.data.pagination,
		items,
		currencies,
		popular: (popularResult.data as any)?.success ? (popularResult.data as any).data : [],
		trending: (trendingResult.data as any)?.success ? (trendingResult.data as any).data : [],
		recommended: (recommendedResult.data as any)?.success ? (recommendedResult.data as any).data : []
	};
};
