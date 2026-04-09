import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { listingsTable, itemsTable, user, userProfilesTable } from '../../db/schemas';
import { eq } from 'drizzle-orm';
import { renderListingPreview } from '../../services/preview-card';
import { listingSelectShape, requestedCurrencyTable, fetchOfferedForListings, serializeListing } from './shared';

// Simple in-memory cache: key = "listingId", value = { png, createdAt }
const cache = new Map<string, { png: Buffer; createdAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_MAX = 200;

function cleanCache() {
	if (cache.size <= CACHE_MAX) return;
	const entries = [...cache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
	const toRemove = entries.slice(0, entries.length - CACHE_MAX);
	for (const [key] of toRemove) cache.delete(key);
}

export const listingPreviewRoutes = new Elysia()
	.get(
		'/:id/preview.png',
		async ({ params, set }) => {
			// Check cache first
			const cached = cache.get(params.id);
			if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
				return new Response(new Uint8Array(cached.png), {
					headers: {
						'content-type': 'image/png',
						'cache-control': 'public, max-age=3600',
					},
				});
			}

			// Fetch listing
			const [listing] = await db
				.select(listingSelectShape)
				.from(listingsTable)
				.innerJoin(user, eq(listingsTable.author_id, user.id))
				.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
				.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
				.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
				.where(eq(listingsTable.id, params.id));

			if (!listing) {
				set.status = 404;
				return { success: false, error: 'Listing not found' };
			}

			try {
				console.log('Preview: fetching offered items for listing', listing.id);
				const { offeredItemsByListing, offeredCurrenciesByListing } =
					await fetchOfferedForListings([listing.id]);
				console.log('Preview: offeredItems map has', offeredItemsByListing.size, 'entries, offeredCurrencies map has', offeredCurrenciesByListing.size);

				const serialized = serializeListing(listing as any, offeredItemsByListing, offeredCurrenciesByListing);

				const requested = serialized.requested_item ?? serialized.requested_currency;

				const offeredItems = Array.isArray(serialized.offered_items) ? serialized.offered_items : [];
				const offeredCurrencies = Array.isArray(serialized.offered_currencies) ? serialized.offered_currencies : [];
				const offered = [
					...offeredItems.map((o: any) => ({
						name: o.item?.name ?? 'Unknown',
						amount: o.amount ?? 1,
						image_url: o.item?.image_url ?? null,
					})),
					...offeredCurrencies.map((o: any) => ({
						name: o.currency?.name ?? 'Unknown',
						amount: o.amount ?? 1,
						image_url: o.currency?.image_url ?? null,
					})),
				];

				const png = await renderListingPreview({
					requested_name: requested?.name ?? 'Unknown Item',
					requested_image_url: requested?.image_url ?? null,
					order_type: serialized.order_type,
					amount: serialized.amount,
					paying_type: serialized.paying_type,
					author_username: serialized.author?.username ?? serialized.author?.display_name ?? 'unknown',
					author_image: serialized.author?.avatar_url ?? null,
					offered,
				});

				cache.set(params.id, { png, createdAt: Date.now() });
				cleanCache();

				return new Response(new Uint8Array(png), {
					headers: {
						'content-type': 'image/png',
						'cache-control': 'public, max-age=3600',
					},
				});
			} catch (err: any) {
				console.error('Preview render error:', err);
				set.status = 500;
				return { success: false, error: err?.message ?? 'Failed to render preview' };
			}
		},
		{ params: t.Object({ id: t.String() }) },
	);
