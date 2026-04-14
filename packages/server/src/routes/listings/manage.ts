import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import {
	listingsTable,
	listingOfferedItemsTable,
	listingOfferedCurrenciesTable,
	itemsTable,
	currenciesTable,
	tradesTable,
	conversationsTable,
	conversationParticipantsTable,
	userProfilesTable,
	user,
} from '../../db/schemas';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { broadcastAll } from '../ws/connection-manager';
import { listingSelectShape, requestedCurrencyTable, fetchOfferedForListings, serializeListing } from './shared';
import { authMiddleware } from '../../middleware/rbac';
import { trackEvent } from '../../services/analytics';

const offeredBody = t.Object({
	requested_item_id: t.Optional(t.String()),
	requested_currency_id: t.Optional(t.String()),
	amount: t.Number(),
	order_type: t.Union([t.Literal('buy'), t.Literal('sell')]),
	paying_type: t.Union([t.Literal('each'), t.Literal('total')]),
	offered_items: t.Optional(t.Array(t.Object({ item_id: t.String(), amount: t.Number() }))),
	offered_currencies: t.Optional(t.Array(t.Object({ currency_id: t.String(), amount: t.Number() }))),
});

function validateRequestedFields(body: { requested_item_id?: string; requested_currency_id?: string }) {
	if (!body.requested_item_id && !body.requested_currency_id)
		return 'Either requested_item_id or requested_currency_id must be provided';
	if (body.requested_item_id && body.requested_currency_id)
		return 'Only one of requested_item_id or requested_currency_id can be set';
	return null;
}

export const listingsManageRoutes = new Elysia()
	.use(authMiddleware)

	// POST / — create listing
	.post(
		'/',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('listing:create')) { set.status = 403; return { success: false, error: 'Forbidden' }; }

			const validationError = validateRequestedFields(body);
			if (validationError) { set.status = 400; return { success: false, error: validationError }; }

			try {
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
						expires_at: expiresAt,
					})
					.returning();

				if (body.offered_items?.length) {
					await db.insert(listingOfferedItemsTable).values(
						body.offered_items.map((i) => ({ listing_id: listing.id, item_id: i.item_id, amount: i.amount })),
					);
				}
				if (body.offered_currencies?.length) {
					await db.insert(listingOfferedCurrenciesTable).values(
						body.offered_currencies.map((c) => ({ listing_id: listing.id, currency_id: c.currency_id, amount: c.amount })),
					);
				}

				trackEvent({ type: "listing_created", userId: session.user.id, metadata: { listing_id: listing.id, order_type: body.order_type, item_id: body.requested_item_id } });

				// Broadcast new listing to all connected users
				try {
					const [full] = await db.select(listingSelectShape)
						.from(listingsTable)
						.innerJoin(user, eq(listingsTable.author_id, user.id))
						.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
						.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
						.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
						.where(eq(listingsTable.id, listing.id));
					if (full) {
						const { offeredItemsByListing, offeredCurrenciesByListing } = await fetchOfferedForListings([listing.id]);
						const serialized = serializeListing(full as any, offeredItemsByListing, offeredCurrenciesByListing);
						broadcastAll({ type: 'new_listing', data: serialized as unknown as Record<string, unknown> });
					}
				} catch { /* fire and forget */ }

				return { success: true, data: listing };
			} catch (err: any) {
				console.error('Create listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{ body: offeredBody, detail: { description: 'Create a new listing' } },
	)

	// PUT /:id — update listing (replaces offered items/currencies)
	.put(
		'/:id',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('listing:update')) { set.status = 403; return { success: false, error: 'Forbidden' }; }

			const validationError = validateRequestedFields(body);
			if (validationError) { set.status = 400; return { success: false, error: validationError }; }

			try {
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) { set.status = 404; return { success: false, error: 'Listing not found' }; }
				if (existing.author_id !== session.user.id) { set.status = 403; return { success: false, error: 'You can only edit your own listings' }; }

				const updated = await db.transaction(async (tx) => {
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

					await tx.delete(listingOfferedItemsTable).where(eq(listingOfferedItemsTable.listing_id, params.id));
					if (body.offered_items?.length) {
						await tx.insert(listingOfferedItemsTable).values(
							body.offered_items.map((i) => ({ listing_id: params.id, item_id: i.item_id, amount: i.amount })),
						);
					}

					await tx.delete(listingOfferedCurrenciesTable).where(eq(listingOfferedCurrenciesTable.listing_id, params.id));
					if (body.offered_currencies?.length) {
						await tx.insert(listingOfferedCurrenciesTable).values(
							body.offered_currencies.map((c) => ({ listing_id: params.id, currency_id: c.currency_id, amount: c.amount })),
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
		{ params: t.Object({ id: t.String() }), body: offeredBody, detail: { description: 'Update an existing listing' } },
	)

	// PATCH /:id/status — change status
	.patch(
		'/:id/status',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			try {
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id, status: listingsTable.status })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) { set.status = 404; return { success: false, error: 'Listing not found' }; }
				if (existing.author_id !== session.user.id) { set.status = 403; return { success: false, error: 'You can only change status of your own listings' }; }
				if (existing.status === 'sold') { set.status = 400; return { success: false, error: 'Sold listings cannot change status' }; }

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
			body: t.Object({ status: t.Union([t.Literal('active'), t.Literal('sold'), t.Literal('paused'), t.Literal('expired')]) }),
			detail: { description: 'Change a listing status' }
		},
	)

	// PATCH /:id/renew — reset expiry to 30 days from now
	.patch(
		'/:id/renew',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			try {
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id, status: listingsTable.status })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) { set.status = 404; return { success: false, error: 'Listing not found' }; }
				if (existing.author_id !== session.user.id) { set.status = 403; return { success: false, error: 'You can only renew your own listings' }; }
				if (existing.status !== 'active' && existing.status !== 'expired') {
					set.status = 400;
					return { success: false, error: 'Only active or expired listings can be renewed' };
				}

				const [updated] = await db
					.update(listingsTable)
					.set({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: 'active' })
					.where(eq(listingsTable.id, params.id))
					.returning();

				trackEvent({ type: "listing_renewed", userId: session.user.id, metadata: { listing_id: params.id } });
				return { success: true, data: updated };
			} catch (err: any) {
				console.error('Renew listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{ params: t.Object({ id: t.String() }), detail: { description: 'Renew a listing for 30 more days' } },
	)

	// GET /:id/contacts — users who messaged about this listing (for buyer selection on sold)
	.get(
		'/:id/contacts',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			const [listing] = await db
				.select({ author_id: listingsTable.author_id })
				.from(listingsTable)
				.where(eq(listingsTable.id, params.id));

			if (!listing) { set.status = 404; return { success: false, error: 'Listing not found' }; }
			if (listing.author_id !== session.user.id) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			// Find conversations linked to this listing, then get the other participants
			const convs = await db
				.select({ id: conversationsTable.id })
				.from(conversationsTable)
				.where(eq(conversationsTable.listing_id, params.id));

			if (convs.length === 0) return { success: true, data: [] };

			const convIds = convs.map((c) => c.id);

			const contacts = await db
				.selectDistinct({
					user_id: user.id,
					username: userProfilesTable.username,
					avatar: user.image,
				})
				.from(conversationParticipantsTable)
				.innerJoin(user, eq(conversationParticipantsTable.user_id, user.id))
				.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
				.where(
					and(
						inArray(conversationParticipantsTable.conversation_id, convIds),
						ne(conversationParticipantsTable.user_id, session.user.id),
					),
				);

			return { success: true, data: contacts };
		},
		{ params: t.Object({ id: t.String() }), detail: { description: 'Get users who contacted about a listing' } },
	)

	// DELETE /:id — hard delete (sold = delete), creates trade record
	.delete(
		'/:id',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			try {
				// Fetch listing with requested item/currency names
				const [existing] = await db
					.select({
						id: listingsTable.id,
						author_id: listingsTable.author_id,
						amount: listingsTable.amount,
						order_type: listingsTable.order_type,
						paying_type: listingsTable.paying_type,
						requested_item_id: listingsTable.requested_item_id,
						requested_currency_id: listingsTable.requested_currency_id,
						requested_item_name: itemsTable.name,
						requested_currency_name: currenciesTable.name,
					})
					.from(listingsTable)
					.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
					.leftJoin(currenciesTable, eq(listingsTable.requested_currency_id, currenciesTable.id))
					.where(eq(listingsTable.id, params.id));

				if (!existing) { set.status = 404; return { success: false, error: 'Listing not found' }; }
				if (existing.author_id !== session.user.id && !session.permissions.includes('listing:moderate')) {
					set.status = 403;
					return { success: false, error: 'Forbidden' };
				}

				// Fetch offered items with names
				const offeredItems = await db
					.select({
						item_id: listingOfferedItemsTable.item_id,
						amount: listingOfferedItemsTable.amount,
						name: itemsTable.name,
					})
					.from(listingOfferedItemsTable)
					.innerJoin(itemsTable, eq(listingOfferedItemsTable.item_id, itemsTable.id))
					.where(eq(listingOfferedItemsTable.listing_id, params.id));

				// Fetch offered currencies with names
				const offeredCurrencies = await db
					.select({
						currency_id: listingOfferedCurrenciesTable.currency_id,
						amount: listingOfferedCurrenciesTable.amount,
						name: currenciesTable.name,
					})
					.from(listingOfferedCurrenciesTable)
					.innerJoin(currenciesTable, eq(listingOfferedCurrenciesTable.currency_id, currenciesTable.id))
					.where(eq(listingOfferedCurrenciesTable.listing_id, params.id));

				// Build listing snapshot
				const listingSnapshot = JSON.stringify({
					requested_item_name: existing.requested_item_name ?? null,
					requested_currency_name: existing.requested_currency_name ?? null,
					amount: existing.amount,
					order_type: existing.order_type,
					paying_type: existing.paying_type,
					offered_items: offeredItems.map((i) => ({ name: i.name, amount: i.amount })),
					offered_currencies: offeredCurrencies.map((c) => ({ name: c.name, amount: c.amount })),
				});

				// Create trade record, then delete listing
				const buyerId = body?.buyer_id ?? null;

				await db.insert(tradesTable).values({
					seller_id: existing.author_id,
					buyer_id: buyerId,
					listing_snapshot: listingSnapshot,
				});

				const [listing] = await db.delete(listingsTable).where(eq(listingsTable.id, params.id)).returning();
				trackEvent({ type: "listing_sold", userId: session.user.id, metadata: { listing_id: params.id } });
				return { success: true, data: listing };
			} catch (err: any) {
				console.error('Delete listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Optional(t.Object({
				buyer_id: t.Optional(t.String()),
			})),
			detail: { description: 'Delete a listing and record the trade' }
		},
	);
