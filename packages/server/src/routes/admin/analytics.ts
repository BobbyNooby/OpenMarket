import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { sql, eq, and, gte, lte, desc, count, countDistinct, inArray } from 'drizzle-orm';
import {
	analyticsEventsTable,
	listingsTable,
	itemsTable,
	currenciesTable,
	messagesTable,
	profileReviewsTable,
	userProfilesTable,
} from '../../db/schemas';
import { user } from '../../db/auth-schema';
import { requirePermission } from '../../middleware/rbac';

function defaultDateRange() {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - 30);
	return { from, to };
}

function parseDateRange(fromStr?: string, toStr?: string) {
	const defaults = defaultDateRange();
	const from = fromStr ? new Date(fromStr) : defaults.from;
	const to = toStr ? new Date(toStr) : defaults.to;
	return { from, to };
}

// Fill missing days with 0s so charts render a continuous series
function fillDays(data: { date: string; count: number }[], from: Date, to: Date) {
	const map = new Map<string, number>();
	for (const d of data) {
		const key = typeof d.date === 'object'
			? (d.date as unknown as Date).toISOString().split('T')[0]
			: String(d.date).split('T')[0];
		map.set(key, d.count);
	}

	const filled: { date: string; count: number }[] = [];
	const current = new Date(from);
	current.setUTCHours(0, 0, 0, 0);
	const end = new Date(to);
	end.setUTCHours(0, 0, 0, 0);
	while (current <= end) {
		const key = current.toISOString().split('T')[0];
		filled.push({ date: key, count: map.get(key) ?? 0 });
		current.setUTCDate(current.getUTCDate() + 1);
	}
	return filled;
}

// Batch-fetch listing names for a list of listing IDs
async function enrichListingIds(listingIds: string[]): Promise<Map<string, string>> {
	const listingNames = new Map<string, string>();
	if (listingIds.length === 0) return listingNames;

	const uniqueIds = [...new Set(listingIds)];
	const listings = await db
		.select({
			id: listingsTable.id,
			item_name: itemsTable.name,
			currency_name: currenciesTable.name,
		})
		.from(listingsTable)
		.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
		.leftJoin(currenciesTable, eq(listingsTable.requested_currency_id, currenciesTable.id))
		.where(inArray(listingsTable.id, uniqueIds));

	for (const l of listings) {
		listingNames.set(l.id, l.item_name ?? l.currency_name ?? 'Unknown');
	}
	return listingNames;
}

// Batch-fetch user profiles for a list of user IDs
async function enrichUserIds(userIds: string[]): Promise<Map<string, { username: string; avatar: string | null }>> {
	const userProfiles = new Map<string, { username: string; avatar: string | null }>();
	if (userIds.length === 0) return userProfiles;

	const profiles = await db
		.select({
			id: user.id,
			username: userProfilesTable.username,
			avatar: user.image,
		})
		.from(user)
		.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
		.where(inArray(user.id, userIds));

	for (const p of profiles) {
		userProfiles.set(p.id, { username: p.username, avatar: p.avatar });
	}
	return userProfiles;
}

const dateQuerySchema = t.Object({
	from: t.Optional(t.String()),
	to: t.Optional(t.String()),
});

export const adminAnalyticsRoutes = new Elysia()
	.use(requirePermission('admin:analytics'))

	// --- GET /analytics/overview ---
	.get(
		'/insights/overview',
		async ({ query }) => {
			try {
				const { from, to } = parseDateRange(query.from, query.to);

				const [
					[totalUsersResult],
					[activeUsersResult],
					[newRegistrationsResult],
					[totalListingsResult],
					[activeListingsResult],
					[totalMessagesResult],
					[totalReviewsResult],
					[totalSearchesResult],
				] = await Promise.all([
					db.select({ value: count() }).from(user),

					db.select({ value: countDistinct(analyticsEventsTable.user_id) })
						.from(analyticsEventsTable)
						.where(
							and(
								gte(analyticsEventsTable.created_at, from),
								lte(analyticsEventsTable.created_at, to)
							)
						),

					db.select({ value: count() })
						.from(user)
						.where(
							and(
								gte(user.createdAt, from),
								lte(user.createdAt, to)
							)
						),

					db.select({ value: count() }).from(listingsTable),

					db.select({ value: count() })
						.from(listingsTable)
						.where(eq(listingsTable.status, 'active')),

					db.select({ value: count() }).from(messagesTable),

					db.select({ value: count() }).from(profileReviewsTable),

					db.select({ value: count() })
						.from(analyticsEventsTable)
						.where(
							and(
								eq(analyticsEventsTable.event_type, 'search'),
								gte(analyticsEventsTable.created_at, from),
								lte(analyticsEventsTable.created_at, to)
							)
						),
				]);

				return {
					success: true,
					data: {
						total_users: totalUsersResult.value,
						active_users: activeUsersResult.value,
						new_registrations: newRegistrationsResult.value,
						total_listings: totalListingsResult.value,
						active_listings: activeListingsResult.value,
						total_messages: totalMessagesResult.value,
						total_reviews: totalReviewsResult.value,
						total_searches: totalSearchesResult.value,
					},
				};
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				console.error('Analytics overview error:', err);
				return { success: false, error: message };
			}
		},
		{ query: dateQuerySchema }
	)

	// --- GET /insights/events ---
	.get(
		'/insights/events',
		async ({ query }) => {
			try {
				const { from, to } = parseDateRange(query.from, query.to);
				const dateFilter = and(
					gte(analyticsEventsTable.created_at, from),
					lte(analyticsEventsTable.created_at, to)
				);

				// Parallel queries for all time-series data
				const [rawEventsPerDay, rawUniqueUsersPerDay, rawPageViewsPerDay, topEventTypes] = await Promise.all([
					db.select({
						date: sql<string>`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`.as('date'),
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(dateFilter)
					.groupBy(sql`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`)
					.orderBy(sql`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`),

					db.select({
						date: sql<string>`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`.as('date'),
						count: countDistinct(analyticsEventsTable.user_id).as('count'),
					})
					.from(analyticsEventsTable)
					.where(dateFilter)
					.groupBy(sql`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`)
					.orderBy(sql`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`),

					db.select({
						date: sql<string>`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`.as('date'),
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(and(dateFilter, eq(analyticsEventsTable.event_type, 'page_view')))
					.groupBy(sql`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`)
					.orderBy(sql`DATE_TRUNC('day', ${analyticsEventsTable.created_at})::date`),

					db.select({
						event_type: analyticsEventsTable.event_type,
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(dateFilter)
					.groupBy(analyticsEventsTable.event_type)
					.orderBy(desc(count()))
					.limit(10),
				]);

				return {
					success: true,
					data: {
						events_per_day: fillDays(rawEventsPerDay, from, to),
						unique_users_per_day: fillDays(rawUniqueUsersPerDay, from, to),
						page_views_per_day: fillDays(rawPageViewsPerDay, from, to),
						top_event_types: topEventTypes,
					},
				};
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				console.error('Analytics events error:', err);
				return { success: false, error: message };
			}
		},
		{ query: dateQuerySchema }
	)

	// --- GET /analytics/search ---
	.get(
		'/insights/search',
		async ({ query }) => {
			try {
				const { from, to } = parseDateRange(query.from, query.to);

				const dateFilter = and(
					eq(analyticsEventsTable.event_type, 'search'),
					gte(analyticsEventsTable.created_at, from),
					lte(analyticsEventsTable.created_at, to)
				);

				const [totalSearchesResult] = await db
					.select({ value: count() })
					.from(analyticsEventsTable)
					.where(dateFilter);

				const topQueries = await db
					.select({
						query: sql<string>`${analyticsEventsTable.metadata}::jsonb->>'query'`.as('search_query'),
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(dateFilter)
					.groupBy(sql`${analyticsEventsTable.metadata}::jsonb->>'query'`)
					.orderBy(desc(count()))
					.limit(10);

				const zeroResultQueries = await db
					.select({
						query: sql<string>`${analyticsEventsTable.metadata}::jsonb->>'query'`.as('search_query'),
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(
						and(
							dateFilter,
							sql`(${analyticsEventsTable.metadata}::jsonb->>'result_count')::int = 0`
						)
					)
					.groupBy(sql`${analyticsEventsTable.metadata}::jsonb->>'query'`)
					.orderBy(desc(count()))
					.limit(10);

				return {
					success: true,
					data: {
						total_searches: totalSearchesResult.value,
						top_queries: topQueries,
						zero_result_queries: zeroResultQueries,
					},
				};
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				console.error('Analytics search error:', err);
				return { success: false, error: message };
			}
		},
		{ query: dateQuerySchema }
	)

	// --- GET /analytics/engagement ---
	.get(
		'/insights/engagement',
		async ({ query }) => {
			try {
				const { from, to } = parseDateRange(query.from, query.to);

				const dateFilter = and(
					gte(analyticsEventsTable.created_at, from),
					lte(analyticsEventsTable.created_at, to)
				);

				const topViewedListings = await db
					.select({
						listing_id: sql<string>`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`.as('listing_id'),
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(
						and(
							eq(analyticsEventsTable.event_type, 'listing_view'),
							dateFilter
						)
					)
					.groupBy(sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`)
					.orderBy(desc(count()))
					.limit(10);

				const topContactedListings = await db
					.select({
						listing_id: sql<string>`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`.as('listing_id'),
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(
						and(
							eq(analyticsEventsTable.event_type, 'listing_contact'),
							dateFilter
						)
					)
					.groupBy(sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id'`)
					.orderBy(desc(count()))
					.limit(10);

				const peakHours = await db
					.select({
						hour: sql<number>`EXTRACT(HOUR FROM ${analyticsEventsTable.created_at})`.as('hour'),
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(dateFilter)
					.groupBy(sql`EXTRACT(HOUR FROM ${analyticsEventsTable.created_at})`)
					.orderBy(sql`EXTRACT(HOUR FROM ${analyticsEventsTable.created_at})`);

				const activeUsersTop10 = await db
					.select({
						user_id: analyticsEventsTable.user_id,
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(dateFilter)
					.groupBy(analyticsEventsTable.user_id)
					.orderBy(desc(count()))
					.limit(10);

				// Top pages by visit count
				const topPages = await db
					.select({
						path: analyticsEventsTable.path,
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.where(and(dateFilter, eq(analyticsEventsTable.event_type, 'page_view')))
					.groupBy(analyticsEventsTable.path)
					.orderBy(desc(count()))
					.limit(10);

				// Most popular items (items that appear in the most viewed listings)
				const popularItems = await db
					.select({
						item_name: itemsTable.name,
						item_image: itemsTable.image_url,
						count: count().as('count'),
					})
					.from(analyticsEventsTable)
					.innerJoin(
						listingsTable,
						sql`${analyticsEventsTable.metadata}::jsonb->>'listing_id' = ${listingsTable.id}::text`
					)
					.innerJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.where(and(dateFilter, eq(analyticsEventsTable.event_type, 'listing_view')))
					.groupBy(itemsTable.name, itemsTable.image_url)
					.orderBy(desc(count()))
					.limit(10);

				// Enrich listing IDs with names
				const listingIds = [
					...topViewedListings.map((l) => l.listing_id),
					...topContactedListings.map((l) => l.listing_id),
				].filter((id): id is string => !!id);

				const userIds = activeUsersTop10
					.map((u) => u.user_id)
					.filter((id): id is string => !!id);

				const [listingNames, userProfiles] = await Promise.all([
					enrichListingIds(listingIds),
					enrichUserIds(userIds),
				]);

				return {
					success: true,
					data: {
						top_viewed_listings: topViewedListings.map((l) => ({
							...l,
							name: listingNames.get(l.listing_id!) ?? l.listing_id,
						})),
						top_contacted_listings: topContactedListings.map((l) => ({
							...l,
							name: listingNames.get(l.listing_id!) ?? l.listing_id,
						})),
						peak_hours: peakHours,
						top_pages: topPages,
						popular_items: popularItems,
						active_users_top10: activeUsersTop10.map((u) => ({
							...u,
							username: userProfiles.get(u.user_id!)?.username ?? u.user_id,
							avatar: userProfiles.get(u.user_id!)?.avatar ?? null,
						})),
					},
				};
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				console.error('Analytics engagement error:', err);
				return { success: false, error: message };
			}
		},
		{ query: dateQuerySchema }
	);
