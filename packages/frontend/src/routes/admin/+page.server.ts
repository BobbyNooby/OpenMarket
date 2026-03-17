import type { PageServerLoad, Actions } from './$types';
import { api } from '$lib/api/server';
import { fail } from '@sveltejs/kit';

function authHeaders(request: Request) {
	return { headers: { cookie: request.headers.get('cookie') || '' } };
}

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

export const actions: Actions = {
	createItem: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string | null;
		const wiki_link = formData.get('wiki_link') as string | null;
		const image_url = formData.get('image_url') as string | null;

		const result = await api.items.post({
			name,
			description: description || undefined,
			wiki_link: wiki_link || undefined,
			image_url: image_url || undefined
		}, authHeaders(request));

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to create item' });
		}

		return { success: true };
	},

	createCurrency: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string | null;
		const wiki_link = formData.get('wiki_link') as string | null;
		const image_url = formData.get('image_url') as string | null;

		const result = await api.currencies.post({
			name,
			description: description || undefined,
			wiki_link: wiki_link || undefined,
			image_url: image_url || undefined
		}, authHeaders(request));

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to create currency' });
		}

		return { success: true };
	},

	updateItem: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string | null;
		const wiki_link = formData.get('wiki_link') as string | null;
		const image_url = formData.get('image_url') as string | null;

const result = await api.items({ id }).put({
			name,
			description: description || undefined,
			wiki_link: wiki_link || undefined,
			image_url: image_url || undefined
		}, authHeaders(request));

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to update item' });
		}

		return { success: true };
	},

	updateCurrency: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string | null;
		const wiki_link = formData.get('wiki_link') as string | null;
		const image_url = formData.get('image_url') as string | null;

const result = await api.currencies({ id }).put({
			name,
			description: description || undefined,
			wiki_link: wiki_link || undefined,
			image_url: image_url || undefined
		}, authHeaders(request));

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to update currency' });
		}

		return { success: true };
	},

	deleteItem: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

const result = await api.items({ id }).delete(null, authHeaders(request));

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to delete item' });
		}

		return { success: true };
	},

	deleteCurrency: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

const result = await api.currencies({ id }).delete(null, authHeaders(request));

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to delete currency' });
		}

		return { success: true };
	}
};
