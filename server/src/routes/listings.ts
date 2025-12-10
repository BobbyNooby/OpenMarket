import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import {
	listingsTable,
	listingOfferedItemsTable,
	listingOfferedCurrenciesTable,
	user,
	userProfilesTable,
	itemsTable,
	currenciesTable
} from '../db/schemas';
import { eq, desc, sql } from 'drizzle-orm';
import type { Listing } from '../types/api';

// Alias for requested currency (to distinguish from offered currencies join)
import { alias } from 'drizzle-orm/pg-core';
const requestedCurrencyTable = alias(currenciesTable, 'requested_currency');

// Helper to serialize dates and nulls for API response
function serializeUser(userData: any, profile: any) {
	return {
		id: userData.id,
		created_at: userData.createdAt.toISOString(),
		username: profile?.username ?? userData.name,
		display_name: userData.name,
		avatar_url: userData.image ?? undefined,
		description: profile?.description ?? undefined
	};
}

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

export const listingsRoutes = new Elysia({ prefix: '/listings' })
	// Get all listings with full details (author, requested item/currency, offered items/currencies)
	// Supports pagination with ?limit=N&offset=M
	.get('/', async ({ query }) => {
		try {
			const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
			const offset = Math.max(parseInt(query.offset || '0', 10), 0);

			// Get total count for pagination info
			const [{ count: totalCount }] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(listingsTable);

			// Get all listings with author and requested item OR currency (one will be null)
			const listings = await db
				.select({
					id: listingsTable.id,
					created_at: listingsTable.created_at,
					amount: listingsTable.amount,
					order_type: listingsTable.order_type,
					paying_type: listingsTable.paying_type,
					is_active: listingsTable.is_active,
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
				.orderBy(desc(listingsTable.created_at))
				.limit(limit)
				.offset(offset);

			// For each listing, get offered items and currencies
			const listingsWithOffers = await Promise.all(
				listings.map(async (listing) => {
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

					const serialized: Listing = {
						id: listing.id,
						created_at: listing.created_at.toISOString(),
						author_id: listing.author.id,
						requested_item_id: listing.requested_item?.id ?? undefined,
						requested_currency_id: listing.requested_currency?.id ?? undefined,
						amount: listing.amount,
						order_type: listing.order_type,
						paying_type: listing.paying_type,
						is_active: listing.is_active,
						author: serializeUser(listing.author, listing.authorProfile),
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
					return serialized;
				})
			);

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
	// Get listings by user ID
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
						is_active: listingsTable.is_active,
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

						const serialized: Listing = {
							id: listing.id,
							created_at: listing.created_at.toISOString(),
							author_id: listing.author.id,
							requested_item_id: listing.requested_item?.id ?? undefined,
							requested_currency_id: listing.requested_currency?.id ?? undefined,
							amount: listing.amount,
							order_type: listing.order_type,
							paying_type: listing.paying_type,
							is_active: listing.is_active,
							author: serializeUser(listing.author, listing.authorProfile),
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
						return serialized;
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
						is_active: listingsTable.is_active,
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

				const serialized: Listing = {
					id: listing.id,
					created_at: listing.created_at.toISOString(),
					author_id: listing.author.id,
					requested_item_id: listing.requested_item?.id ?? undefined,
					requested_currency_id: listing.requested_currency?.id ?? undefined,
					amount: listing.amount,
					order_type: listing.order_type,
					paying_type: listing.paying_type,
					is_active: listing.is_active,
					author: serializeUser(listing.author, listing.authorProfile),
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

				return { success: true, data: serialized };
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
		async ({ body }) => {
			try {
				// Validate that exactly one of requested_item_id or requested_currency_id is set
				if (!body.requested_item_id && !body.requested_currency_id) {
					return { success: false, error: 'Either requested_item_id or requested_currency_id must be provided', status: 400 };
				}
				if (body.requested_item_id && body.requested_currency_id) {
					return { success: false, error: 'Only one of requested_item_id or requested_currency_id can be set', status: 400 };
				}

				const [listing] = await db
					.insert(listingsTable)
					.values({
						author_id: body.author_id,
						requested_item_id: body.requested_item_id,
						requested_currency_id: body.requested_currency_id,
						amount: body.amount,
						order_type: body.order_type,
						paying_type: body.paying_type
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
				author_id: t.String(),
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
	// Delete listing
	.delete(
		'/:id',
		async ({ params }) => {
			try {
				const [listing] = await db
					.delete(listingsTable)
					.where(eq(listingsTable.id, params.id))
					.returning();

				if (!listing) {
					return { success: false, error: 'Listing not found', status: 404 };
				}

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
