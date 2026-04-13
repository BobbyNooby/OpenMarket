import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/api/fetch';

export const load: PageServerLoad = async ({ request, url }) => {
	const cookie = request.headers.get('cookie') || '';

	let conversations: unknown[] = [];
	try {
		const res = await apiFetch('/api/conversations', {
			headers: { cookie }
		});
		const json = await res.json();
		if (json.success) conversations = json.data;
	} catch {
		// not logged in or error
	}

	const openConversationId = url.searchParams.get('conv') || null;

	return { conversations, openConversationId };
};
