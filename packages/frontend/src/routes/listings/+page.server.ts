import type { PageServerLoad } from './$types';
import { api } from '$lib/api/server';
import { apiFetch } from '$lib/api/fetch';

export const load: PageServerLoad = async ({ url, request }) => {
	const cookie = request.headers.get('cookie') || '';
	const limit = 20;

	// Read filter params from URL
	const q = url.searchParams.get('q') || '';
	const orderType = url.searchParams.get('orderType') || 'all';
	const status = url.searchParams.get('status') || 'active';
	const itemId = url.searchParams.get('itemId') || '';
	const currencyId = url.searchParams.get('currencyId') || '';
	const categoryId = url.searchParams.get('categoryId') || '';
	const sortBy = url.searchParams.get('sortBy') || 'newest';
	const minAmount = url.searchParams.get('minAmount') || '';
	const maxAmount = url.searchParams.get('maxAmount') || '';

	// Build query object, only include non-empty params
	const query: Record<string, string> = {
		limit: String(limit),
		offset: '0',
		status
	};
	if (q) query.q = q;
	if (orderType && orderType !== 'all') query.orderType = orderType;
	if (itemId) query.itemId = itemId;
	if (currencyId) query.currencyId = currencyId;
	if (categoryId) query.categoryId = categoryId;
	if (sortBy && sortBy !== 'newest') query.sortBy = sortBy;
	if (minAmount) query.minAmount = minAmount;
	if (maxAmount) query.maxAmount = maxAmount;

	const [listingsResult, itemsResult, currenciesResult, categoriesResult, watchlistRes] = await Promise.all([
		api.listings.get({ query }),
		api.items.get(),
		api.currencies.get(),
		api.categories.get(),
		apiFetch('/watchlist/ids', { headers: { cookie } })
			.then((r) => r.json())
			.catch(() => ({ success: false, data: [] }))
	]);

	return {
		listings: listingsResult.data?.success ? listingsResult.data.data : [],
		pagination: listingsResult.data?.success ? listingsResult.data.pagination : null,
		items: itemsResult.data?.success ? itemsResult.data.data : [],
		currencies: currenciesResult.data?.success ? currenciesResult.data.data : [],
		categories: categoriesResult.data?.success ? categoriesResult.data.data : [],
		watchlistIds: (watchlistRes?.success ? watchlistRes.data : []) as string[],
		// Pass current filter state so the page can initialize from URL
		filters: { q, orderType, status, itemId, currencyId, categoryId, sortBy, minAmount, maxAmount }
	};
};
