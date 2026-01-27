import type { PageServerLoad } from './$types';
import { api } from '$lib/api/server';

export const load: PageServerLoad = async () => {
	// Fetch all items and currencies
	const [itemsResult, currenciesResult] = await Promise.all([
		api.items.get(),
		api.currencies.get()
	]);

	const items = itemsResult.data?.success ? itemsResult.data.data : [];
	const currencies = currenciesResult.data?.success ? currenciesResult.data.data : [];

	return {
		items,
		currencies
	};
};
