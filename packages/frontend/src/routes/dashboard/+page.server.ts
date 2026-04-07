import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api/server';
import { PUBLIC_API_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

type ListingStats = { total_views: number; unique_sessions: number; unique_users: number; messages: number };

export const load: PageServerLoad = async ({ request }) => {
	const cookie = request.headers.get('cookie') || '';
	const headers = { cookie };

	const sessionRes = await api['api']['auth']['get-session'].get({ headers });
	const session = sessionRes.data;
	if (!session?.user) throw redirect(302, '/');

	// Fetch all dashboard data in parallel
	const [listingsRes, tradesRes, profileRes, conversationsRes] = await Promise.all([
		api.listings.user({ userId: session.user.id }).get({ headers }),
		api.users.trades.get({ headers }).catch(() => null),
		api.users.profile({ username: session.user.name }).get({ headers }).catch(() => null),
		fetch(`${PUBLIC_API_URL}/api/conversations`, { headers: { cookie } })
			.then((r) => r.json())
			.catch(() => null),
	]);

	const listings = (listingsRes.data?.success ? listingsRes.data.data : []) ?? [];
	const trades = (tradesRes?.data as any)?.success ? (tradesRes?.data as any).data : [];
	const profile = (profileRes?.data as any)?.success ? (profileRes?.data as any).data : null;
	const conversations = conversationsRes?.success ? conversationsRes.data : [];

	const statsMap: Record<string, ListingStats> = {};
	if (listings.length > 0) {
		const statsResults = await Promise.all(
			listings.map((listing) =>
				api.listings.stats({ id: listing.id }).get({ headers }).catch(() => null)
			)
		);
		for (let i = 0; i < listings.length; i++) {
			const result = statsResults[i];
			if (result?.data?.success && result.data.data) {
				statsMap[listings[i].id] = result.data.data as ListingStats;
			}
		}
	}

	return { listings, statsMap, session, trades, profile, conversations };
};
