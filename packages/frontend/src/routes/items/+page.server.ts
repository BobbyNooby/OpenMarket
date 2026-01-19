import type { PageServerLoad } from './$types';
import { api } from '$lib/api/client';

export const load: PageServerLoad = async () => {
	// Fetch all items and currencies
	const [itemsResult, currenciesResult] = await Promise.all([
		api.items.index.get(),
		api.currencies.index.get()
	]);

	const items = itemsResult.data?.success ? itemsResult.data.data : [];
	const currencies = currenciesResult.data?.success ? currenciesResult.data.data : [];

	return {
		items,
		currencies
	};
};
