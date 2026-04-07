import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api/server';

export const load = async ({ request, parent }) => {
	const { session } = await parent();
	if (!session?.user) redirect(302, '/');

	const cookie = request.headers.get('cookie') || '';
	const headers = { cookie };

	const [accountsRes] = await Promise.all([
		api.users.accounts.get({ headers }).catch(() => null),
	]);

	const accounts = accountsRes?.data?.success ? accountsRes.data.data : [];

	return { session, accounts };
};