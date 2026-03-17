import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import {
	listingsTable,
	listingOfferedItemsTable,
	listingOfferedCurrenciesTable,
	itemsTable,
	currenciesTable,
	user,
	userProfilesTable
} from '../db/schemas';
import { eq, desc, asc, sql, and, or, ilike, gte, lte, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/rbac';

// Alias for requested currency (to distinguish from offered currencies join)
import { alias } from 'drizzle-orm/pg-core';
const requestedCurrencyTable = alias(currenciesTable, 'requested_currency');

function serializeItem(item: any) {
	return {
		id: item.id,
		created_at: item.created_at.toISOString(),
		slug: item.slug,
		name: item.name,
		description: item.description ?? undefined,
		wiki_link: item.wiki_link ?? undefined,
		image_url: item.image_url ?? undefined
	};
}

function serializeCurrency(currency: any) {
	return {
		id: currency.id,
		created_at: currency.created_at.toISOString(),
		slug: currency.slug,
		name: currency.name,
		description: currency.description ?? undefined,
		wiki_link: currency.wiki_link ?? undefined,
		image_url: currency.image_url ?? undefined
	};
}

// Nullable versions for requested_item/requested_currency (only one will be set)
function serializeItemOrNull(item: any) {
	if (!item || !item.id) return undefined;
	return serializeItem(item);
}

function serializeCurrencyOrNull(currency: any) {
	if (!currency || !currency.id) return undefined;
	return serializeCurrency(currency);
}

function serializeAuthor(userData: any, profile: any) {
	return {
		id: userData.id,
		created_at: userData.createdAt.toISOString(),
		username: profile?.username ?? userData.name,
		display_name: userData.name,
		avatar_url: userData.image ?? undefined,
		description: profile?.description ?? undefined
	};
}

export const listingsRoutes = new Elysia({ prefix: '/listings' })
	.use(authMiddleware)
	// Get all listings with full details (author, requested item/currency, offered items/currencies)
	// Supports pagination, search, filtering, and sorting
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

			// Build dynamic WHERE conditions
			const conditions: ReturnType<typeof eq>[] = [];

			if (statusFilter !== 'all') {
				conditions.push(eq(listingsTable.status, statusFilter as any));
			}
			if (orderTypeFilter && orderTypeFilter !== 'all') {
				conditions.push(eq(listingsTable.order_type, orderTypeFilter as any));
			}
			if (itemIdFilter) {
				conditions.push(eq(listingsTable.requested_item_id, itemIdFilter));
			}
			if (currencyIdFilter) {
				conditions.push(eq(listingsTable.requested_currency_id, currencyIdFilter));
			}
			if (minAmount !== undefined && !isNaN(minAmount)) {
				conditions.push(gte(listingsTable.amount, minAmount));
			}
			if (maxAmount !== undefined && !isNaN(maxAmount)) {
				conditions.push(lte(listingsTable.amount, maxAmount));
			}
			if (searchQuery) {
				conditions.push(
					or(
						ilike(itemsTable.name, `%${searchQuery}%`),
						ilike(requestedCurrencyTable.name, `%${searchQuery}%`)
					)!
				);
			}
			if (categoryIdFilter) {
				conditions.push(eq(itemsTable.category_id, categoryIdFilter));
			}

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			// Determine sort order
			const orderByClause = sortBy === 'oldest' ? asc(listingsTable.created_at)
				: sortBy === 'amount_asc' ? asc(listingsTable.amount)
				: sortBy === 'amount_desc' ? desc(listingsTable.amount)
				: desc(listingsTable.created_at);

			// Get total count for pagination info
			const [{ count: totalCount }] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(listingsTable)
				.innerJoin(user, eq(listingsTable.author_id, user.id))
				.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
				.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
				.where(whereClause);

			// Get all listings with author and requested item OR currency (one will be null)
			const listings = await db
				.select({
					id: listingsTable.id,
					created_at: listingsTable.created_at,
					amount: listingsTable.amount,
					order_type: listingsTable.order_type,
					paying_type: listingsTable.paying_type,
					status: listingsTable.status,
					expires_at: listingsTable.expires_at,
					author: {
						id: user.id,
						name: user.name,
						image: user.image,
						createdAt: user.createdAt
					},
					authorProfile: {
						username: userProfilesTable.username,
						description: userProfilesTable.description
					},
					requested_item: {
						id: itemsTable.id,
						slug: itemsTable.slug,
						name: itemsTable.name,
						description: itemsTable.description,
						wiki_link: itemsTable.wiki_link,
						image_url: itemsTable.image_url,
						created_at: itemsTable.created_at
					},
					requested_currency: {
						id: requestedCurrencyTable.id,
						slug: requestedCurrencyTable.slug,
						name: requestedCurrencyTable.name,
						description: requestedCurrencyTable.description,
						wiki_link: requestedCurrencyTable.wiki_link,
						image_url: requestedCurrencyTable.image_url,
						created_at: requestedCurrencyTable.created_at
					}
				})
				.from(listingsTable)
				.innerJoin(user, eq(listingsTable.author_id, user.id))
				.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
				.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
				.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
				.where(whereClause)
				.orderBy(orderByClause)
				.limit(limit)
				.offset(offset);

			// Batch-fetch offered items and currencies for all listings (2 queries instead of N*2)
			const listingIds = listings.map((l) => l.id);

			const [allOfferedItems, allOfferedCurrencies] = listingIds.length > 0
				? await Promise.all([
					db.select({
						listing_id: listingOfferedItemsTable.listing_id,
						item: {
							id: itemsTable.id,
							slug: itemsTable.slug,
							name: itemsTable.name,
							description: itemsTable.description,
							wiki_link: itemsTable.wiki_link,
							image_url: itemsTable.image_url,
							created_at: itemsTable.created_at
						},
						amount: listingOfferedItemsTable.amount
					})
					.from(listingOfferedItemsTable)
					.innerJoin(itemsTable, eq(listingOfferedItemsTable.item_id, itemsTable.id))
					.where(inArray(listingOfferedItemsTable.listing_id, listingIds)),

					db.select({
						listing_id: listingOfferedCurrenciesTable.listing_id,
						currency: {
							id: currenciesTable.id,
							slug: currenciesTable.slug,
							name: currenciesTable.name,
							description: currenciesTable.description,
							wiki_link: currenciesTable.wiki_link,
							image_url: currenciesTable.image_url,
							created_at: currenciesTable.created_at
						},
						amount: listingOfferedCurrenciesTable.amount
					})
					.from(listingOfferedCurrenciesTable)
					.innerJoin(currenciesTable, eq(listingOfferedCurrenciesTable.currency_id, currenciesTable.id))
					.where(inArray(listingOfferedCurrenciesTable.listing_id, listingIds))
				])
				: [[], []];

			// Group by listing ID for O(1) lookup
			const offeredItemsByListing = new Map<string, typeof allOfferedItems>();
			for (const row of allOfferedItems) {
				const arr = offeredItemsByListing.get(row.listing_id) || [];
				arr.push(row);
				offeredItemsByListing.set(row.listing_id, arr);
			}
			const offeredCurrenciesByListing = new Map<string, typeof allOfferedCurrencies>();
			for (const row of allOfferedCurrencies) {
				const arr = offeredCurrenciesByListing.get(row.listing_id) || [];
				arr.push(row);
				offeredCurrenciesByListing.set(row.listing_id, arr);
			}

			const listingsWithOffers = listings.map((listing) => ({
				id: listing.id,
				created_at: listing.created_at.toISOString(),
				author_id: listing.author.id,
				requested_item_id: listing.requested_item?.id ?? undefined,
				requested_currency_id: listing.requested_currency?.id ?? undefined,
				amount: listing.amount,
				order_type: listing.order_type,
				paying_type: listing.paying_type,
				status: listing.status,
				expires_at: listing.expires_at?.toISOString() ?? null,
				author: serializeAuthor(listing.author, listing.authorProfile),
				requested_item: serializeItemOrNull(listing.requested_item),
				requested_currency: serializeCurrencyOrNull(listing.requested_currency),
				offered_items: (offeredItemsByListing.get(listing.id) || []).map((o) => ({
					item: serializeItem(o.item),
					amount: o.amount
				})),
				offered_currencies: (offeredCurrenciesByListing.get(listing.id) || []).map((o) => ({
					currency: serializeCurrency(o.currency),
					amount: o.amount
				}))
			}));

			return {
				success: true,
				data: listingsWithOffers,
				pagination: {
					total: totalCount,
					limit,
					offset,
					hasMore: offset + listings.length < totalCount
				}
			};
		} catch (err: any) {
			console.error('Get listings error:', err);
			return { success: false, error: err.message, status: 500 };
		}
	})
	// Get listings by author ID
	.get(
		'/user/:userId',
		async ({ params }) => {
			try {
				const listings = await db
					.select({
						id: listingsTable.id,
						created_at: listingsTable.created_at,
						amount: listingsTable.amount,
						order_type: listingsTable.order_type,
						paying_type: listingsTable.paying_type,
						status: listingsTable.status,
						expires_at: listingsTable.expires_at,
						author: {
							id: user.id,
							name: user.name,
							image: user.image,
							createdAt: user.createdAt
						},
						authorProfile: {
							username: userProfilesTable.username,
							description: userProfilesTable.description
						},
						requested_item: {
							id: itemsTable.id,
							slug: itemsTable.slug,
							name: itemsTable.name,
							description: itemsTable.description,
							wiki_link: itemsTable.wiki_link,
							image_url: itemsTable.image_url,
							created_at: itemsTable.created_at
						},
						requested_currency: {
							id: requestedCurrencyTable.id,
							slug: requestedCurrencyTable.slug,
							name: requestedCurrencyTable.name,
							description: requestedCurrencyTable.description,
							wiki_link: requestedCurrencyTable.wiki_link,
							image_url: requestedCurrencyTable.image_url,
							created_at: requestedCurrencyTable.created_at
						}
					})
					.from(listingsTable)
					.innerJoin(user, eq(listingsTable.author_id, user.id))
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
					.where(eq(listingsTable.author_id, params.userId))
					.orderBy(desc(listingsTable.created_at));

				// Get offers for each listing
				const listingsWithOffers = await Promise.all(
					listings.map(async (listing) => {
						const offeredItems = await db
							.select({
								item: {
									id: itemsTable.id,
									slug: itemsTable.slug,
									name: itemsTable.name,
									description: itemsTable.description,
									wiki_link: itemsTable.wiki_link,
									image_url: itemsTable.image_url,
									created_at: itemsTable.created_at
								},
								amount: listingOfferedItemsTable.amount
							})
							.from(listingOfferedItemsTable)
							.innerJoin(itemsTable, eq(listingOfferedItemsTable.item_id, itemsTable.id))
							.where(eq(listingOfferedItemsTable.listing_id, listing.id));

						const offeredCurrencies = await db
							.select({
								currency: {
									id: currenciesTable.id,
									slug: currenciesTable.slug,
									name: currenciesTable.name,
									description: currenciesTable.description,
									wiki_link: currenciesTable.wiki_link,
									image_url: currenciesTable.image_url,
									created_at: currenciesTable.created_at
								},
								amount: listingOfferedCurrenciesTable.amount
							})
							.from(listingOfferedCurrenciesTable)
							.innerJoin(
								currenciesTable,
								eq(listingOfferedCurrenciesTable.currency_id, currenciesTable.id)
							)
							.where(eq(listingOfferedCurrenciesTable.listing_id, listing.id));

						return {
							id: listing.id,
							created_at: listing.created_at.toISOString(),
							author_id: listing.author.id,
							requested_item_id: listing.requested_item?.id ?? undefined,
							requested_currency_id: listing.requested_currency?.id ?? undefined,
							amount: listing.amount,
							order_type: listing.order_type,
							paying_type: listing.paying_type,
							status: listing.status,
							author: serializeAuthor(listing.author, listing.authorProfile),
							requested_item: serializeItemOrNull(listing.requested_item),
							requested_currency: serializeCurrencyOrNull(listing.requested_currency),
							offered_items: offeredItems.map((o) => ({
								item: serializeItem(o.item),
								amount: o.amount
							})),
							offered_currencies: offeredCurrencies.map((o) => ({
								currency: serializeCurrency(o.currency),
								amount: o.amount
							}))
						};
					})
				);

				return { success: true, data: listingsWithOffers };
			} catch (err: any) {
				console.error('Get user listings error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				userId: t.String()
			})
		}
	)
	// Get single listing by ID
	.get(
		'/:id',
		async ({ params }) => {
			try {
				const [listing] = await db
					.select({
						id: listingsTable.id,
						created_at: listingsTable.created_at,
						amount: listingsTable.amount,
						order_type: listingsTable.order_type,
						paying_type: listingsTable.paying_type,
						status: listingsTable.status,
						expires_at: listingsTable.expires_at,
						author: {
							id: user.id,
							name: user.name,
							image: user.image,
							createdAt: user.createdAt
						},
						authorProfile: {
							username: userProfilesTable.username,
							description: userProfilesTable.description
						},
						requested_item: {
							id: itemsTable.id,
							slug: itemsTable.slug,
							name: itemsTable.name,
							description: itemsTable.description,
							wiki_link: itemsTable.wiki_link,
							image_url: itemsTable.image_url,
							created_at: itemsTable.created_at
						},
						requested_currency: {
							id: requestedCurrencyTable.id,
							slug: requestedCurrencyTable.slug,
							name: requestedCurrencyTable.name,
							description: requestedCurrencyTable.description,
							wiki_link: requestedCurrencyTable.wiki_link,
							image_url: requestedCurrencyTable.image_url,
							created_at: requestedCurrencyTable.created_at
						}
					})
					.from(listingsTable)
					.innerJoin(user, eq(listingsTable.author_id, user.id))
					.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
					.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
					.where(eq(listingsTable.id, params.id));

				if (!listing) {
					return { success: false, error: 'Listing not found', status: 404 };
				}

				// Get offered items
				const offeredItems = await db
					.select({
						item: {
							id: itemsTable.id,
							slug: itemsTable.slug,
							name: itemsTable.name,
							description: itemsTable.description,
							wiki_link: itemsTable.wiki_link,
							image_url: itemsTable.image_url,
							created_at: itemsTable.created_at
						},
						amount: listingOfferedItemsTable.amount
					})
					.from(listingOfferedItemsTable)
					.innerJoin(itemsTable, eq(listingOfferedItemsTable.item_id, itemsTable.id))
					.where(eq(listingOfferedItemsTable.listing_id, listing.id));

				// Get offered currencies
				const offeredCurrencies = await db
					.select({
						currency: {
							id: currenciesTable.id,
							slug: currenciesTable.slug,
							name: currenciesTable.name,
							description: currenciesTable.description,
							wiki_link: currenciesTable.wiki_link,
							image_url: currenciesTable.image_url,
							created_at: currenciesTable.created_at
						},
						amount: listingOfferedCurrenciesTable.amount
					})
					.from(listingOfferedCurrenciesTable)
					.innerJoin(
						currenciesTable,
						eq(listingOfferedCurrenciesTable.currency_id, currenciesTable.id)
					)
					.where(eq(listingOfferedCurrenciesTable.listing_id, listing.id));

				return {
					success: true,
					data: {
						id: listing.id,
						created_at: listing.created_at.toISOString(),
						author_id: listing.author.id,
						requested_item_id: listing.requested_item?.id ?? undefined,
						requested_currency_id: listing.requested_currency?.id ?? undefined,
						amount: listing.amount,
						order_type: listing.order_type,
						paying_type: listing.paying_type,
						status: listing.status,
						expires_at: listing.expires_at?.toISOString() ?? null,
						author: serializeAuthor(listing.author, listing.authorProfile),
						requested_item: serializeItemOrNull(listing.requested_item),
						requested_currency: serializeCurrencyOrNull(listing.requested_currency),
						offered_items: offeredItems.map((o) => ({
							item: serializeItem(o.item),
							amount: o.amount
						})),
						offered_currencies: offeredCurrencies.map((o) => ({
							currency: serializeCurrency(o.currency),
							amount: o.amount
						}))
					}
				};
			} catch (err: any) {
				console.error('Get listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	)
	// Create listing
	.post(
		'/',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('listing:create')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				// Validate that exactly one of requested_item_id or requested_currency_id is set
				if (!body.requested_item_id && !body.requested_currency_id) {
					return { success: false, error: 'Either requested_item_id or requested_currency_id must be provided', status: 400 };
				}
				if (body.requested_item_id && body.requested_currency_id) {
					return { success: false, error: 'Only one of requested_item_id or requested_currency_id can be set', status: 400 };
				}

				const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

				const [listing] = await db
					.insert(listingsTable)
					.values({
						author_id: session.user.id,
						requested_item_id: body.requested_item_id,
						requested_currency_id: body.requested_currency_id,
						amount: body.amount,
						order_type: body.order_type,
						paying_type: body.paying_type,
						expires_at: expiresAt
					})
					.returning();

				// Insert offered items
				if (body.offered_items && body.offered_items.length > 0) {
					await db.insert(listingOfferedItemsTable).values(
						body.offered_items.map((item) => ({
							listing_id: listing.id,
							item_id: item.item_id,
							amount: item.amount
						}))
					);
				}

				// Insert offered currencies
				if (body.offered_currencies && body.offered_currencies.length > 0) {
					await db.insert(listingOfferedCurrenciesTable).values(
						body.offered_currencies.map((currency) => ({
							listing_id: listing.id,
							currency_id: currency.currency_id,
							amount: currency.amount
						}))
					);
				}

				return { success: true, data: listing };
			} catch (err: any) {
				console.error('Create listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			body: t.Object({
				requested_item_id: t.Optional(t.String()),
				requested_currency_id: t.Optional(t.String()),
				amount: t.Number(),
				order_type: t.Union([t.Literal('buy'), t.Literal('sell')]),
				paying_type: t.Union([t.Literal('each'), t.Literal('total')]),
				offered_items: t.Optional(
					t.Array(
						t.Object({
							item_id: t.String(),
							amount: t.Number()
						})
					)
				),
				offered_currencies: t.Optional(
					t.Array(
						t.Object({
							currency_id: t.String(),
							amount: t.Number()
						})
					)
				)
			})
		}
	)
	// Update listing
	.put(
		'/:id',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('listing:update')) { set.status = 403; return { success: false, error: 'Forbidden' }; }

			try {
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) {
					set.status = 404;
					return { success: false, error: 'Listing not found' };
				}

				if (existing.author_id !== session.user.id) {
					set.status = 403;
					return { success: false, error: 'You can only edit your own listings' };
				}

				// Validate that exactly one of requested_item_id or requested_currency_id is set
				if (!body.requested_item_id && !body.requested_currency_id) {
					return { success: false, error: 'Either requested_item_id or requested_currency_id must be provided', status: 400 };
				}
				if (body.requested_item_id && body.requested_currency_id) {
					return { success: false, error: 'Only one of requested_item_id or requested_currency_id can be set', status: 400 };
				}

				const updated = await db.transaction(async (tx) => {
					// Update listing fields
					const [listing] = await tx
						.update(listingsTable)
						.set({
							requested_item_id: body.requested_item_id ?? null,
							requested_currency_id: body.requested_currency_id ?? null,
							amount: body.amount,
							order_type: body.order_type,
							paying_type: body.paying_type,
						})
						.where(eq(listingsTable.id, params.id))
						.returning();

					// Replace offered items
					await tx.delete(listingOfferedItemsTable).where(eq(listingOfferedItemsTable.listing_id, params.id));
					if (body.offered_items && body.offered_items.length > 0) {
						await tx.insert(listingOfferedItemsTable).values(
							body.offered_items.map((item) => ({
								listing_id: params.id,
								item_id: item.item_id,
								amount: item.amount,
							}))
						);
					}

					// Replace offered currencies
					await tx.delete(listingOfferedCurrenciesTable).where(eq(listingOfferedCurrenciesTable.listing_id, params.id));
					if (body.offered_currencies && body.offered_currencies.length > 0) {
						await tx.insert(listingOfferedCurrenciesTable).values(
							body.offered_currencies.map((currency) => ({
								listing_id: params.id,
								currency_id: currency.currency_id,
								amount: currency.amount,
							}))
						);
					}

					return listing;
				});

				return { success: true, data: updated };
			} catch (err: any) {
				console.error('Update listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				requested_item_id: t.Optional(t.String()),
				requested_currency_id: t.Optional(t.String()),
				amount: t.Number(),
				order_type: t.Union([t.Literal('buy'), t.Literal('sell')]),
				paying_type: t.Union([t.Literal('each'), t.Literal('total')]),
				offered_items: t.Optional(
					t.Array(
						t.Object({
							item_id: t.String(),
							amount: t.Number()
						})
					)
				),
				offered_currencies: t.Optional(
					t.Array(
						t.Object({
							currency_id: t.String(),
							amount: t.Number()
						})
					)
				)
			})
		}
	)
	// Update listing status
	.patch(
		'/:id/status',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			try {
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id, status: listingsTable.status })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) {
					set.status = 404;
					return { success: false, error: 'Listing not found' };
				}

				if (existing.author_id !== session.user.id) {
					set.status = 403;
					return { success: false, error: 'You can only change status of your own listings' };
				}

				// Enforce state transition rules
				if (existing.status === 'sold') {
					set.status = 400;
					return { success: false, error: 'Sold listings cannot change status' };
				}

				const [updated] = await db
					.update(listingsTable)
					.set({ status: body.status })
					.where(eq(listingsTable.id, params.id))
					.returning();

				return { success: true, data: updated };
			} catch (err: any) {
				console.error('Update listing status error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				status: t.Union([t.Literal('active'), t.Literal('sold'), t.Literal('paused'), t.Literal('expired')])
			})
		}
	)
	// Renew listing (reset expiry to 30 days from now)
	.patch(
		'/:id/renew',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			try {
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id, status: listingsTable.status })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) {
					set.status = 404;
					return { success: false, error: 'Listing not found' };
				}

				if (existing.author_id !== session.user.id) {
					set.status = 403;
					return { success: false, error: 'You can only renew your own listings' };
				}

				if (existing.status !== 'active' && existing.status !== 'expired') {
					set.status = 400;
					return { success: false, error: 'Only active or expired listings can be renewed' };
				}

				const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

				const [updated] = await db
					.update(listingsTable)
					.set({ expires_at: newExpiresAt, status: 'active' })
					.where(eq(listingsTable.id, params.id))
					.returning();

				return { success: true, data: updated };
			} catch (err: any) {
				console.error('Renew listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() })
		}
	)
	// Delete listing
	.delete(
		'/:id',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			try {
				// Fetch listing to check ownership
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) {
					set.status = 404;
					return { success: false, error: 'Listing not found' };
				}

				if (existing.author_id !== session.user.id && !session.permissions.includes('listing:moderate')) {
					set.status = 403;
					return { success: false, error: 'Forbidden' };
				}

				const [listing] = await db
					.delete(listingsTable)
					.where(eq(listingsTable.id, params.id))
					.returning();

				return { success: true, data: listing };
			} catch (err: any) {
				console.error('Delete listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	);
