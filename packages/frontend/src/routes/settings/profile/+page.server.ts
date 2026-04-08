import { redirect, fail } from '@sveltejs/kit';
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

export const actions = {
	save: async ({ request }) => {
		const cookie = request.headers.get('cookie') || '';
		const formData = await request.formData();

		const username = (formData.get('username') as string ?? '').trim().toLowerCase();
		const description = (formData.get('description') as string) || undefined;
		const bio = (formData.get('bio') as string) || undefined;
		const social_links = (formData.get('social_links') as string) || undefined;
		const accent_color = (formData.get('accent_color') as string) || undefined;

		const result = await api.users.profile.post(
			{ username, description, bio, social_links, accent_color },
			{ headers: { cookie } },
		);

		const payload = result.data as { success: boolean; error?: string } | null;
		if (!payload?.success) {
			return fail(400, { error: payload?.error || 'Failed to save profile' });
		}

		return { success: true };
	},
};
