import type { PageServerLoad } from './$types';
import { api } from '$lib/api/server';
import { error } from '@sveltejs/kit';

async function fetchReverseLists(
	kind: 'item' | 'currency',
	id: string,
	headers: { cookie: string },
) {
	const query = kind === 'item' ? { item_id: id } : { currency_id: id };
	const [haveRes, wantRes] = await Promise.all([
		api.lists.search.get({ query: { list_type: 'have', limit: '12', ...query }, headers }),
		api.lists.search.get({ query: { list_type: 'want', limit: '12', ...query }, headers }),
	]);
	return {
		haveUsers: haveRes.data?.success ? (haveRes.data as any).data : [],
		haveTotal: haveRes.data?.success ? (haveRes.data as any).pagination.total : 0,
		wantUsers: wantRes.data?.success ? (wantRes.data as any).data : [],
		wantTotal: wantRes.data?.success ? (wantRes.data as any).pagination.total : 0,
	};
}

export const load: PageServerLoad = async ({ params, request, parent }) => {
	const { session } = await parent();
	const cookie = request.headers.get('cookie') || '';
	const headers = { cookie };

	// Try to find the item by slug
	const itemResult = await api.items({ id: params.slug }).get({ headers });

	if (itemResult.data?.success && itemResult.data.data) {
		const item = itemResult.data.data;
		const [listingsResult, reverse] = await Promise.all([
			api.listings.get({ headers }),
			fetchReverseLists('item', item.id, headers),
		]);
		const listings =
			listingsResult.data?.success && listingsResult.data.data
				? listingsResult.data.data.filter((l: any) => l.requested_item?.id === item.id)
				: [];

		return {
			session,
			item,
			itemType: 'item' as const,
			listings,
			...reverse,
		};
	}

	// Try currencies if item not found
	const currencyResult = await api.currencies({ id: params.slug }).get({ headers });

	if (currencyResult.data?.success && currencyResult.data.data) {
		const currency = currencyResult.data.data;
		const [listingsResult, reverse] = await Promise.all([
			api.listings.get({ headers }),
			fetchReverseLists('currency', currency.id, headers),
		]);
		const listings =
			listingsResult.data?.success && listingsResult.data.data
				? listingsResult.data.data.filter((l: any) => l.requested_currency?.id === currency.id)
				: [];

		return {
			session,
			item: currency,
			itemType: 'currency' as const,
			listings,
			...reverse,
		};
	}

	// Neither found
	error(404, 'Item or currency not found');
};
