import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import {
	listingsTable,
	listingOfferedItemsTable,
	listingOfferedCurrenciesTable,
} from '../../db/schemas';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../../middleware/rbac';

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

				return { success: true, data: listing };
			} catch (err: any) {
				console.error('Create listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{ body: offeredBody },
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
		{ params: t.Object({ id: t.String() }), body: offeredBody },
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

				return { success: true, data: updated };
			} catch (err: any) {
				console.error('Renew listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{ params: t.Object({ id: t.String() }) },
	)

	// DELETE /:id — hard delete (sold = delete)
	.delete(
		'/:id',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			try {
				const [existing] = await db
					.select({ id: listingsTable.id, author_id: listingsTable.author_id })
					.from(listingsTable)
					.where(eq(listingsTable.id, params.id));

				if (!existing) { set.status = 404; return { success: false, error: 'Listing not found' }; }
				if (existing.author_id !== session.user.id && !session.permissions.includes('listing:moderate')) {
					set.status = 403;
					return { success: false, error: 'Forbidden' };
				}

				const [listing] = await db.delete(listingsTable).where(eq(listingsTable.id, params.id)).returning();
				return { success: true, data: listing };
			} catch (err: any) {
				console.error('Delete listing error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{ params: t.Object({ id: t.String() }) },
	);
