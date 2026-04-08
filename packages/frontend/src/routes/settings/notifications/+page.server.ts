import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api/server';

export const load = async ({ request, parent }) => {
	const { session } = await parent();
	if (!session?.user) redirect(302, '/');

	const cookie = request.headers.get('cookie') || '';
	const headers = { cookie };

	const profileRes = await api.users.profile({ username: session.user.name }).get({ headers });
	const profile = profileRes.data?.success ? profileRes.data.data : null;
	if (!profile) redirect(302, '/');

	return { session, profile };
};
