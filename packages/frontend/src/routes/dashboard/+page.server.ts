import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api/server';
import type { PageServerLoad } from './$types';

type ListingStats = { total_views: number; unique_sessions: number; unique_users: number; messages: number };

export const load: PageServerLoad = async ({ request }) => {
	const headers = { cookie: request.headers.get('cookie') || '' };

	const sessionRes = await api['api']['auth']['get-session'].get({ headers });
	const session = sessionRes.data;
	if (!session?.user) throw redirect(302, '/');

	const listingsRes = await api.listings.user({ userId: session.user.id }).get({ headers });
	const listings = (listingsRes.data?.success ? listingsRes.data.data : []) ?? [];

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

	// Fetch trade history
	const tradesRes = await api.users.trades.get({ headers }).catch(() => null);
	const trades = (tradesRes?.data as any)?.success ? (tradesRes?.data as any).data : [];

	return { listings, statsMap, session, trades };
};
