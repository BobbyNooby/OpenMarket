import type { PageServerLoad } from './$types';
import { api } from '$lib/api/client';

export const load: PageServerLoad = async () => {
	// Fetch items and currencies for the form
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
