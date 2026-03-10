import type { PageServerLoad, Actions } from './$types';
import { api } from '$lib/api/server';
import { fail, redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent, request }) => {
	const { session } = await parent();

	if (!session?.user) {
		throw redirect(303, '/listings');
	}

	// Fetch listing, items, and currencies in parallel
	const [listingResult, itemsResult, currenciesResult] = await Promise.all([
		api.listings({ id: params.id }).get({ headers: { cookie: request.headers.get('cookie') || '' } }),
		api.items.get(),
		api.currencies.get(),
	]);

	const listing = listingResult.data?.success ? listingResult.data.data : null;

	if (!listing) {
		throw error(404, 'Listing not found');
	}

	if (listing.author_id !== session.user.id) {
		throw error(403, 'You can only edit your own listings');
	}

	const items = itemsResult.data?.success ? itemsResult.data.data : [];
	const currencies = currenciesResult.data?.success ? currenciesResult.data.data : [];

	return {
		listing,
		items,
		currencies,
		session,
	};
};

export const actions: Actions = {
	updateListing: async ({ request, params }) => {
		const formData = await request.formData();

		const body: any = {
			amount: parseInt(formData.get('amount') as string),
			order_type: formData.get('order_type') as 'buy' | 'sell',
			paying_type: formData.get('paying_type') as 'each' | 'total',
			offered_items: JSON.parse(formData.get('offered_items') as string || '[]'),
			offered_currencies: JSON.parse(formData.get('offered_currencies') as string || '[]'),
		};

		const requested_item_id = formData.get('requested_item_id') as string | null;
		const requested_currency_id = formData.get('requested_currency_id') as string | null;

		if (requested_item_id) {
			body.requested_item_id = requested_item_id;
		}
		if (requested_currency_id) {
			body.requested_currency_id = requested_currency_id;
		}

		const result = await api.listings({ id: params.id }).put(body, {
			headers: { cookie: request.headers.get('cookie') || '' },
		});

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to update listing' });
		}

		throw redirect(303, '/listings');
	},
};
