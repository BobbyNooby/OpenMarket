import type { PageServerLoad } from './$types';
import { api } from '$lib/api/client';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	// Try to find the item by slug
	// @ts-expect-error - Eden treaty type inference
	const itemResult = await api.items({ idOrSlug: params.slug }).get();

	if (itemResult.data?.success && itemResult.data.data) {
		const item = itemResult.data.data;
		// Get all listings and filter by this item (where people WANT this item)
		const listingsResult = await api.listings.get();
		const listings =
			listingsResult.data?.success && listingsResult.data.data
				? listingsResult.data.data.filter((l: any) => l.requested_item?.id === item.id)
				: [];

		return {
			item,
			itemType: 'item' as const,
			listings
		};
	}

	// Try currencies if item not found
	// @ts-expect-error - Eden treaty type inference
	const currencyResult = await api.currencies({ idOrSlug: params.slug }).get();

	if (currencyResult.data?.success && currencyResult.data.data) {
		const currency = currencyResult.data.data;
		// Show listings where people WANT this currency (requested_currency_id matches)
		const listingsResult = await api.listings.get();
		const listings =
			listingsResult.data?.success && listingsResult.data.data
				? listingsResult.data.data.filter((l: any) => l.requested_currency?.id === currency.id)
				: [];

		return {
			item: currency,
			itemType: 'currency' as const,
			listings
		};
	}

	// Neither found
	error(404, 'Item or currency not found');
};
