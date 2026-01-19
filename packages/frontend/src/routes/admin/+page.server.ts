import type { PageServerLoad } from './$types';
import { api } from '$lib/api/client';

export const load: PageServerLoad = async () => {
	const [itemsResult, currenciesResult] = await Promise.all([
		api.items.get(),
		api.currencies.get()
	]);

	return {
		items: itemsResult.data?.success ? itemsResult.data.data : [],
		currencies: currenciesResult.data?.success ? currenciesResult.data.data : []
	};
};
