import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { listingsTable, itemsTable, userProfilesTable, user } from '../../db/schemas';
import { eq, desc, asc, sql, and, or, ilike, gte, lte } from 'drizzle-orm';
import {
	requestedCurrencyTable,
	listingSelectShape,
	fetchOfferedForListings,
	serializeListing,
} from './shared';

export const listingsBrowseRoutes = new Elysia()

	// GET / — browse listings with search, filters, sort, pagination
	.get('/', async ({ query }) => {
		try {
			const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
			const offset = Math.max(parseInt(query.offset || '0', 10), 0);
			const statusFilter = query.status || 'active';
			const searchQuery = query.q?.trim();
			const orderTypeFilter = query.orderType;
			const itemIdFilter = query.itemId;
			const currencyIdFilter = query.currencyId;
			const categoryIdFilter = query.categoryId;
			const sortBy = query.sortBy || 'newest';
			const minAmount = query.minAmount ? parseInt(query.minAmount, 10) : undefined;
			const maxAmount = query.maxAmount ? parseInt(query.maxAmount, 10) : undefined;

			const conditions: ReturnType<typeof eq>[] = [];
			if (statusFilter !== 'all') conditions.push(eq(listingsTable.status, statusFilter as any));
			if (orderTypeFilter && orderTypeFilter !== 'all') conditions.push(eq(listingsTable.order_type, orderTypeFilter as any));
			if (itemIdFilter) conditions.push(eq(listingsTable.requested_item_id, itemIdFilter));
			if (currencyIdFilter) conditions.push(eq(listingsTable.requested_currency_id, currencyIdFilter));
			if (minAmount !== undefined && !isNaN(minAmount)) conditions.push(gte(listingsTable.amount, minAmount));
			if (maxAmount !== undefined && !isNaN(maxAmount)) conditions.push(lte(listingsTable.amount, maxAmount));
			if (searchQuery) conditions.push(or(ilike(itemsTable.name, `%${searchQuery}%`), ilike(requestedCurrencyTable.name, `%${searchQuery}%`))!);
			if (categoryIdFilter) conditions.push(eq(itemsTable.category_id, categoryIdFilter));

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
			const orderByClause =
				sortBy === 'oldest' ? asc(listingsTable.created_at)
				: sortBy === 'amount_asc' ? asc(listingsTable.amount)
				: sortBy === 'amount_desc' ? desc(listingsTable.amount)
				: desc(listingsTable.created_at);

			const baseJoins = (q: ReturnType<typeof db.select>) =>
				q.from(listingsTable)
					.innerJoin(user, eq(listingsTable.author_id, user.id))
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id));

			const [{ count: totalCount }] = await (baseJoins(
				db.select({ count: sql<number>`count(*)::int` }) as any
			) as any).where(whereClause);

			const listings = await (baseJoins(db.select(listingSelectShape) as any) as any)
				.where(whereClause)
				.orderBy(orderByClause)
				.limit(limit)
				.offset(offset);

			const { offeredItemsByListing, offeredCurrenciesByListing } =
				await fetchOfferedForListings(listings.map((l: any) => l.id));

			return {
				success: true,
				data: listings.map((l: any) => serializeListing(l, offeredItemsByListing, offeredCurrenciesByListing)),
				pagination: { total: totalCount, limit, offset, hasMore: offset + listings.length < totalCount },
			};
		} catch (err: any) {
			console.error('Get listings error:', err);
			return { success: false, error: err.message, status: 500 };
		}
	})

	// GET /user/:userId — all listings by a specific author
	.get(
		'/user/:userId',
		async ({ params }) => {
			try {
				const listings = await db
					.select(listingSelectShape)
					.from(listingsTable)
					.innerJoin(user, eq(listingsTable.author_id, user.id))
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
					.where(eq(listingsTable.author_id, params.userId))
					.orderBy(desc(listingsTable.created_at));

				const { offeredItemsByListing, offeredCurrenciesByListing } =
					await fetchOfferedForListings(listings.map((l) => l.id));

				return {
					success: true,
					data: listings.map((l) => serializeListing(l as any, offeredItemsByListing, offeredCurrenciesByListing)),
				};
			} catch (err: any) {
				console.error('Get user listings error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{ params: t.Object({ userId: t.String() }) },
	)

	// GET /:id — single listing by ID
	.get(
		'/:id',
		async ({ params, set }) => {
			try {
				const [listing] = await db
					.select(listingSelectShape)
					.from(listingsTable)
					.innerJoin(user, eq(listingsTable.author_id, user.id))
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
					.where(eq(listingsTable.id, params.id));

				if (!listing) { set.status = 404; return { success: false, error: 'Listing not found' }; }

				const { offeredItemsByListing, offeredCurrenciesByListing } =
					await fetchOfferedForListings([listing.id]);

				return {
					success: true,
					data: serializeListing(listing as any, offeredItemsByListing, offeredCurrenciesByListing),
				};
			} catch (err: any) {
				console.error('Get listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{ params: t.Object({ id: t.String() }) },
	);
