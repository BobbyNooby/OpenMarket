import type { PageServerLoad, Actions } from './$types';
import { api } from '$lib/api/server';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { session } = await parent();

	// Fetch items and currencies for the form
	const [itemsResult, currenciesResult] = await Promise.all([
		api.items.get(),
		api.currencies.get()
	]);

	const items = itemsResult.data?.success ? itemsResult.data.data : [];
	const currencies = currenciesResult.data?.success ? currenciesResult.data.data : [];

	return {
		items,
		currencies,
		session
	};
};

export const actions: Actions = {
	createListing: async ({ request }) => {
		const formData = await request.formData();

		const body: any = {
			amount: parseInt(formData.get('amount') as string),
			order_type: formData.get('order_type') as 'buy' | 'sell',
			paying_type: formData.get('paying_type') as 'each' | 'total',
			offered_items: JSON.parse(formData.get('offered_items') as string || '[]'),
			offered_currencies: JSON.parse(formData.get('offered_currencies') as string || '[]')
		};

		const requested_item_id = formData.get('requested_item_id') as string | null;
		const requested_currency_id = formData.get('requested_currency_id') as string | null;

		if (requested_item_id) {
			body.requested_item_id = requested_item_id;
		}
		if (requested_currency_id) {
			body.requested_currency_id = requested_currency_id;
		}

		const result = await api.listings.post(body, {
			headers: { cookie: request.headers.get('cookie') || '' }
		});

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to create listing' });
		}

		throw redirect(303, '/listings');
	}
};
