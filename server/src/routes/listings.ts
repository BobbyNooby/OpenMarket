import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import {
	listingsTable,
	listingOfferedItemsTable,
	listingOfferedCurrenciesTable,
	usersTable,
	itemsTable,
	currenciesTable
} from '../db/schemas';
import { eq, desc } from 'drizzle-orm';
import type { Listing } from '../types/api';

// Helper to serialize dates and nulls for API response
function serializeUser(user: any) {
	return {
		id: user.id,
		created_at: user.created_at.toISOString(),
		discord_id: user.discord_id,
		username: user.username,
		display_name: user.display_name,
		avatar_url: user.avatar_url ?? undefined,
		description: user.description ?? undefined
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

export const listingsRoutes = new Elysia({ prefix: '/listings' })
	// Get all listings with full details (author, requested item, offered items/currencies)
	.get('/', async () => {
		try {
			// Get all listings with author and requested item
			const listings = await db
				.select({
					id: listingsTable.id,
					created_at: listingsTable.created_at,
					amount: listingsTable.amount,
					order_type: listingsTable.order_type,
					paying_type: listingsTable.paying_type,
					is_active: listingsTable.is_active,
					author: {
						id: usersTable.id,
						discord_id: usersTable.discord_id,
						username: usersTable.username,
						display_name: usersTable.display_name,
						avatar_url: usersTable.avatar_url,
						description: usersTable.description,
						created_at: usersTable.created_at
					},
					requested_item: {
						id: itemsTable.id,
						slug: itemsTable.slug,
						name: itemsTable.name,
						description: itemsTable.description,
						wiki_link: itemsTable.wiki_link,
						image_url: itemsTable.image_url,
						created_at: itemsTable.created_at
					}
				})
				.from(listingsTable)
				.innerJoin(usersTable, eq(listingsTable.author_id, usersTable.id))
				.innerJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
				.orderBy(desc(listingsTable.created_at));

			// For each listing, get offered items and currencies
			const listingsWithOffers = await Promise.all(
				listings.map(async (listing) => {
					// Get offered items
					const offeredItems = await db
						.select({
							item: {
								id: itemsTable.id,
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
						requested_item_id: listing.requested_item.id,
						amount: listing.amount,
						order_type: listing.order_type,
						paying_type: listing.paying_type,
						is_active: listing.is_active,
						author: serializeUser(listing.author),
						requested_item: serializeItem(listing.requested_item),
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
							id: usersTable.id,
							discord_id: usersTable.discord_id,
							username: usersTable.username,
							display_name: usersTable.display_name,
							avatar_url: usersTable.avatar_url,
							description: usersTable.description,
							created_at: usersTable.created_at
						},
						requested_item: {
							id: itemsTable.id,
							name: itemsTable.name,
							description: itemsTable.description,
							wiki_link: itemsTable.wiki_link,
							image_url: itemsTable.image_url,
							created_at: itemsTable.created_at
						}
					})
					.from(listingsTable)
					.innerJoin(usersTable, eq(listingsTable.author_id, usersTable.id))
					.innerJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.where(eq(listingsTable.author_id, params.userId))
					.orderBy(desc(listingsTable.created_at));

				// Get offers for each listing
				const listingsWithOffers = await Promise.all(
					listings.map(async (listing) => {
						const offeredItems = await db
							.select({
								item: {
									id: itemsTable.id,
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
							requested_item_id: listing.requested_item.id,
							amount: listing.amount,
							order_type: listing.order_type,
							paying_type: listing.paying_type,
							is_active: listing.is_active,
							author: serializeUser(listing.author),
							requested_item: serializeItem(listing.requested_item),
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
							id: usersTable.id,
							discord_id: usersTable.discord_id,
							username: usersTable.username,
							display_name: usersTable.display_name,
							avatar_url: usersTable.avatar_url,
							description: usersTable.description,
							created_at: usersTable.created_at
						},
						requested_item: {
							id: itemsTable.id,
							name: itemsTable.name,
							description: itemsTable.description,
							wiki_link: itemsTable.wiki_link,
							image_url: itemsTable.image_url,
							created_at: itemsTable.created_at
						}
					})
					.from(listingsTable)
					.innerJoin(usersTable, eq(listingsTable.author_id, usersTable.id))
					.innerJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
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
					requested_item_id: listing.requested_item.id,
					amount: listing.amount,
					order_type: listing.order_type,
					paying_type: listing.paying_type,
					is_active: listing.is_active,
					author: serializeUser(listing.author),
					requested_item: serializeItem(listing.requested_item),
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
				const [listing] = await db
					.insert(listingsTable)
					.values({
						author_id: body.author_id,
						requested_item_id: body.requested_item_id,
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
				requested_item_id: t.String(),
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
