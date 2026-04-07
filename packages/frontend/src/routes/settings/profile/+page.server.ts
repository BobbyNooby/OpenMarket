import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api/server';

export const load = async ({ request, parent }) => {
	const { session } = await parent();
	if (!session?.user) redirect(302, '/');

	const cookie = request.headers.get('cookie') || '';
	const headers = { cookie };

	// session.user.name is this project's stand-in for username
	const [profileRes, itemsRes, currenciesRes, listsRes] = await Promise.all([
		api.users.profile({ username: session.user.name }).get({ headers }),
		api.items.get({ headers }),
		api.currencies.get({ headers }),
		api.lists.user({ userId: session.user.id }).get({ headers }),
	]);

	const profile = profileRes.data?.success ? profileRes.data.data : null;
	if (!profile) redirect(302, '/');

	const items = itemsRes.data?.success ? itemsRes.data.data : [];
	const currencies = currenciesRes.data?.success ? currenciesRes.data.data : [];
	const lists = listsRes.data?.success ? listsRes.data.data : { have: [], want: [] };

	return { session, profile, items, currencies, lists };
};
