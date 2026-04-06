import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import {
	analyticsEventsTable,
	listingsTable,
	itemsTable,
	userProfilesTable,
	user,
	conversationsTable,
} from '../../db/schemas';
import { sql, eq, and, desc, gte, inArray, countDistinct } from 'drizzle-orm';
import { authMiddleware } from '../../middleware/rbac';
import {
	requestedCurrencyTable,
	listingSelectShape,
	fetchOfferedForListings,
	serializeListing,
} from './shared';

// --- Shared helpers to reduce duplication across endpoints ---

// Get top listings by unique session views since a given date
async function fetchTopListings(
	since: Date,
	limit: number,
): Promise<{ listing_id: string; view_count: number }[]> {
	const rows = await db
		.select({
			listing_id: sql<string>`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`,
			view_count: sql<number>`count(distinct ${analyticsEventsTable.session_id})::int`,
		})
		.from(analyticsEventsTable)
		.where(
			and(
				eq(analyticsEventsTable.event_type, 'listing_view'),
				gte(analyticsEventsTable.created_at, since),
			),
		)
		.groupBy(sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`)
		.orderBy(desc(sql`count(distinct ${analyticsEventsTable.session_id})`))
		.limit(limit);

	return rows.filter((r): r is { listing_id: string; view_count: number } => Boolean(r.listing_id));
}

// Fetch full listing data for a list of IDs, serialize, and optionally merge extra fields
async function fetchAndSerializeListings<T extends Record<string, unknown>>(
	listingIds: string[],
	extraFieldsFn?: (listingId: string) => T,
): Promise<(ReturnType<typeof serializeListing> & T)[]> {
	if (listingIds.length === 0) return [];

	const listings = await db
		.select(listingSelectShape)
		.from(listingsTable)
		.innerJoin(user, eq(listingsTable.author_id, user.id))
		.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
		.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
		.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
		.where(and(inArray(listingsTable.id, listingIds), eq(listingsTable.status, 'active')));

	const { offeredItemsByListing, offeredCurrenciesByListing } = await fetchOfferedForListings(
		listings.map((l) => l.id),
	);

	return listings.map((l) => {
		const serialized = serializeListing(
			l as Parameters<typeof serializeListing>[0],
			offeredItemsByListing,
			offeredCurrenciesByListing,
		);
		if (extraFieldsFn) {
			return { ...serialized, ...extraFieldsFn(l.id) } as ReturnType<typeof serializeListing> & T;
		}
		return serialized as ReturnType<typeof serializeListing> & T;
	});
}

export const listingAnalyticsRoutes = new Elysia()

	// GET /stats/:id — listing stats for the author
	.use(authMiddleware)
	.get(
		'/stats/:id',
		async ({ params, session, set }) => {
			try {
				if (!session.user) {
					set.status = 401;
					return { success: false, error: 'Authentication required' };
				}

				// Look up listing to verify ownership
				const [listing] = await db
					.select({ author_id: listingsTable.author_id })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!listing) {
					set.status = 404;
					return { success: false, error: 'Listing not found' };
				}

				const isAdmin = session.roles.includes('admin');
				if (listing.author_id !== session.user.id && !isAdmin) {
					set.status = 403;
					return { success: false, error: 'Not authorized' };
				}

				const listingIdFilter = sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id' = ${params.id}`;
				const eventTypeFilter = eq(analyticsEventsTable.event_type, 'listing_view');
				const whereClause = and(eventTypeFilter, listingIdFilter);

				const [viewStats] = await db
					.select({
						total_views: sql<number>`count(*)::int`,
						unique_sessions: countDistinct(analyticsEventsTable.session_id),
						unique_users: sql<number>`count(distinct ${analyticsEventsTable.user_id}) filter (where ${analyticsEventsTable.user_id} is not null)`,
					})
					.from(analyticsEventsTable)
					.where(whereClause);

				const [messageStats] = await db
					.select({
						messages: sql<number>`count(*)::int`,
					})
					.from(conversationsTable)
					.where(eq(conversationsTable.listing_id, params.id));

				return {
					success: true,
					data: {
						total_views: viewStats?.total_views ?? 0,
						unique_sessions: viewStats?.unique_sessions ?? 0,
						unique_users: viewStats?.unique_users ?? 0,
						messages: messageStats?.messages ?? 0,
					},
				};
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				console.error('Listing stats error:', err);
				return { success: false, error: message, status: 500 };
			}
		},
		{ params: t.Object({ id: t.String() }) },
	)

	// GET /popular — top 10 popular listings (most views last 7 days)
	.get('/popular', async () => {
		try {
			const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
			const topListings = await fetchTopListings(sevenDaysAgo, 10);

			if (topListings.length === 0) {
				return { success: true, data: [] };
			}

			const viewCountMap = new Map(topListings.map((r) => [r.listing_id, r.view_count]));
			const listingIds = topListings.map((r) => r.listing_id);

			const serialized = await fetchAndSerializeListings(listingIds, (id) => ({
				view_count: viewCountMap.get(id) ?? 0,
			}));

			serialized.sort((a, b) => b.view_count - a.view_count);

			return { success: true, data: serialized };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			console.error('Popular listings error:', err);
			return { success: false, error: message, status: 500 };
		}
	})

	// GET /trending — top 10 trending listings (highest view velocity last 24h)
	.get('/trending', async () => {
		try {
			const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
			const hoursElapsed = 24;
			const topListings = await fetchTopListings(twentyFourHoursAgo, 10);

			if (topListings.length === 0) {
				return { success: true, data: [] };
			}

			const listingIds = topListings.map((r) => r.listing_id);

			const velocityMap = new Map(
				topListings.map((r) => [r.listing_id, r.view_count / hoursElapsed]),
			);

			const serialized = await fetchAndSerializeListings(listingIds, (id) => ({
				velocity: Math.round((velocityMap.get(id) ?? 0) * 100) / 100,
			}));

			serialized.sort((a, b) => b.velocity - a.velocity);

			return { success: true, data: serialized };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			console.error('Trending listings error:', err);
			return { success: false, error: message, status: 500 };
		}
	})

	// GET /recommended — personalized recommendations (auth required)
	.get('/recommended', async ({ session, set }) => {
		try {
			if (!session.user) {
				set.status = 401;
				return { success: false, error: 'Authentication required' };
			}

			const userId = session.user.id;

			// Get listing IDs the user has viewed
			const viewedRows = await db
				.select({
					listing_id: sql<string>`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`,
				})
				.from(analyticsEventsTable)
				.where(
					and(
						eq(analyticsEventsTable.event_type, 'listing_view'),
						eq(analyticsEventsTable.user_id, userId),
					),
				)
				.groupBy(sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`);

			const viewedListingIds = viewedRows
				.map((r) => r.listing_id)
				.filter(Boolean) as string[];

			// If user has < 3 viewed items, fall back to popular
			if (viewedListingIds.length < 3) {
				const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
				const topListings = await fetchTopListings(sevenDaysAgo, 10);
				const fallbackIds = topListings.map((r) => r.listing_id);

				if (fallbackIds.length === 0) {
					return { success: true, data: [] };
				}

				const data = await fetchAndSerializeListings(fallbackIds);
				return { success: true, data };
			}

			// Get item/currency IDs from user's viewed listings
			const viewedListings = await db
				.select({
					requested_item_id: listingsTable.requested_item_id,
					requested_currency_id: listingsTable.requested_currency_id,
				})
				.from(listingsTable)
				.where(inArray(listingsTable.id, viewedListingIds));

			const viewedItemIds = viewedListings
				.map((l) => l.requested_item_id)
				.filter(Boolean) as string[];
			const viewedCurrencyIds = viewedListings
				.map((l) => l.requested_currency_id)
				.filter(Boolean) as string[];

			// Find other users who viewed the same items
			const similarUserConditions = [];
			if (viewedItemIds.length > 0) {
				similarUserConditions.push(inArray(listingsTable.requested_item_id, viewedItemIds));
			}
			if (viewedCurrencyIds.length > 0) {
				similarUserConditions.push(inArray(listingsTable.requested_currency_id, viewedCurrencyIds));
			}

			if (similarUserConditions.length === 0) {
				return { success: true, data: [] };
			}

			// Find other users who viewed listings with the same items
			const otherUserViewRows = await db
				.select({
					other_user_id: analyticsEventsTable.user_id,
				})
				.from(analyticsEventsTable)
				.innerJoin(
					listingsTable,
					sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id' = ${listingsTable.id}::text`,
				)
				.where(
					and(
						eq(analyticsEventsTable.event_type, 'listing_view'),
						sql`${analyticsEventsTable.user_id} is not null`,
						sql`${analyticsEventsTable.user_id} != ${userId}`,
						...(similarUserConditions.length === 1
							? similarUserConditions
							: [sql`(${similarUserConditions.map((c) => c).reduce((a, b) => sql`${a} or ${b}`)})`]),
					),
				)
				.groupBy(analyticsEventsTable.user_id)
				.limit(50);

			const otherUserIds = otherUserViewRows
				.map((r) => r.other_user_id)
				.filter(Boolean) as string[];

			if (otherUserIds.length === 0) {
				return { success: true, data: [] };
			}

			// Find what listings those users viewed that the current user hasn't
			const recommendedViewRows = await db
				.select({
					listing_id: sql<string>`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`,
					score: sql<number>`count(distinct ${analyticsEventsTable.user_id})::int`,
				})
				.from(analyticsEventsTable)
				.where(
					and(
						eq(analyticsEventsTable.event_type, 'listing_view'),
						inArray(analyticsEventsTable.user_id, otherUserIds),
						sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id' not in (${sql.join(
							viewedListingIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					),
				)
				.groupBy(sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`)
				.orderBy(desc(sql`count(distinct ${analyticsEventsTable.user_id})`))
				.limit(10);

			const recommendedIds = recommendedViewRows
				.map((r) => r.listing_id)
				.filter(Boolean) as string[];

			if (recommendedIds.length === 0) {
				return { success: true, data: [] };
			}

			const data = await fetchAndSerializeListings(recommendedIds);
			return { success: true, data };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			console.error('Recommended listings error:', err);
			return { success: false, error: message, status: 500 };
		}
	});
