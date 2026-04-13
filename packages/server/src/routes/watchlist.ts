import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import {
	watchlistTable,
	listingsTable,
	itemsTable,
	userProfilesTable,
	user,
} from '../db/schemas';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/rbac';
import {
	requestedCurrencyTable,
	listingSelectShape,
	fetchOfferedForListings,
	serializeListing,
} from './listings/shared';

export const watchlistRoutes = new Elysia({ prefix: '/watchlist', detail: { tags: ['Watchlist'] } })
	.use(authMiddleware)

	// GET /watchlist — list authenticated user's saved listings
	.get('/', async ({ session, set }) => {
		if (!session.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

		const saved = await db
			.select({
				listing_id: watchlistTable.listing_id,
				created_at: watchlistTable.created_at,
			})
			.from(watchlistTable)
			.where(eq(watchlistTable.user_id, session.user.id))
			.orderBy(desc(watchlistTable.created_at));

		if (saved.length === 0) return { success: true, data: [] };

		const listingIds = saved.map((s) => s.listing_id);

		const listings = await db
			.select(listingSelectShape)
			.from(listingsTable)
			.innerJoin(user, eq(listingsTable.author_id, user.id))
			.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
			.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
			.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
			.where(inArray(listingsTable.id, listingIds));

		const { offeredItemsByListing, offeredCurrenciesByListing } =
			await fetchOfferedForListings(listings.map((l) => l.id));

		// Preserve saved-order (newest saved first)
		const orderMap = new Map(saved.map((s, i) => [s.listing_id, i]));
		const serialized = listings
			.map((l) => serializeListing(l as Parameters<typeof serializeListing>[0], offeredItemsByListing, offeredCurrenciesByListing))
			.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

		return { success: true, data: serialized };
	}, { detail: { description: 'List saved listings for current user' } })

	// GET /watchlist/ids — lightweight: just the IDs (used by listing pages to show heart state)
	.get('/ids', async ({ session, set }) => {
		if (!session.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

		const rows = await db
			.select({ listing_id: watchlistTable.listing_id })
			.from(watchlistTable)
			.where(eq(watchlistTable.user_id, session.user.id));

		return { success: true, data: rows.map((r) => r.listing_id) };
	}, { detail: { description: 'Get saved listing IDs for current user' } })

	// POST /watchlist/:listingId — toggle saved state
	.post(
		'/:listingId',
		async ({ params, session, set }) => {
			if (!session.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			// Check listing exists
			const [listing] = await db
				.select({ id: listingsTable.id })
				.from(listingsTable)
				.where(eq(listingsTable.id, params.listingId));
			if (!listing) { set.status = 404; return { success: false, error: 'Listing not found' }; }

			// Check existing
			const [existing] = await db
				.select()
				.from(watchlistTable)
				.where(
					and(
						eq(watchlistTable.user_id, session.user.id),
						eq(watchlistTable.listing_id, params.listingId),
					),
				);

			if (existing) {
				await db
					.delete(watchlistTable)
					.where(
						and(
							eq(watchlistTable.user_id, session.user.id),
							eq(watchlistTable.listing_id, params.listingId),
						),
					);
				return { success: true, saved: false };
			}

			await db
				.insert(watchlistTable)
				.values({ user_id: session.user.id, listing_id: params.listingId });

			return { success: true, saved: true };
		},
		{ params: t.Object({ listingId: t.String() }), detail: { description: 'Toggle a listing saved state' } },
	);
