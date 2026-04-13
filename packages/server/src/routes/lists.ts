import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import {
	userItemListsTable,
	itemsTable,
	currenciesTable,
	user,
	userProfilesTable,
	usersActivityTable,
} from '../db/schemas';
import { and, eq, sql, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/rbac';

const MAX_PER_LIST = 50;

export const listsRoutes = new Elysia({ prefix: '/lists', detail: { tags: ['Users'] } })
	.use(authMiddleware)

	// GET /lists/:userId — fetch a user's have/want lists (public)
	.get(
		'/user/:userId',
		async ({ params }) => {
			const rows = await db
				.select({
					id: userItemListsTable.id,
					list_type: userItemListsTable.list_type,
					created_at: userItemListsTable.created_at,
					item_id: userItemListsTable.item_id,
					currency_id: userItemListsTable.currency_id,
					item_name: itemsTable.name,
					item_slug: itemsTable.slug,
					item_image: itemsTable.image_url,
					item_description: itemsTable.description,
					currency_name: currenciesTable.name,
					currency_slug: currenciesTable.slug,
					currency_image: currenciesTable.image_url,
					currency_description: currenciesTable.description,
				})
				.from(userItemListsTable)
				.leftJoin(itemsTable, eq(userItemListsTable.item_id, itemsTable.id))
				.leftJoin(currenciesTable, eq(userItemListsTable.currency_id, currenciesTable.id))
				.where(eq(userItemListsTable.user_id, params.userId))
				.orderBy(desc(userItemListsTable.created_at));

			const have: any[] = [];
			const want: any[] = [];
			for (const r of rows) {
				const entry = r.item_id
					? {
							id: r.id,
							kind: 'item' as const,
							item_id: r.item_id,
							name: r.item_name ?? 'Unknown',
							slug: r.item_slug ?? '',
							image_url: r.item_image ?? null,
							description: r.item_description ?? null,
							created_at: r.created_at.toISOString(),
						}
					: {
							id: r.id,
							kind: 'currency' as const,
							currency_id: r.currency_id!,
							name: r.currency_name ?? 'Unknown',
							slug: r.currency_slug ?? '',
							image_url: r.currency_image ?? null,
							description: r.currency_description ?? null,
							created_at: r.created_at.toISOString(),
						};
				if (r.list_type === 'have') have.push(entry);
				else want.push(entry);
			}

			return { success: true, data: { have, want } };
		},
		{ params: t.Object({ userId: t.String() }), detail: { description: 'Get a user have/want lists' } },
	)

	// POST /lists — add an entry for the authenticated user
	.post(
		'/',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			// Validate exactly one of item_id / currency_id is set
			if ((!!body.item_id) === (!!body.currency_id)) {
				set.status = 400;
				return { success: false, error: 'Provide exactly one of item_id or currency_id' };
			}

			const userId = session.user.id;

			// Enforce 50-cap per list
			const [{ count }] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(userItemListsTable)
				.where(
					and(
						eq(userItemListsTable.user_id, userId),
						eq(userItemListsTable.list_type, body.list_type),
					),
				);

			if (count >= MAX_PER_LIST) {
				set.status = 400;
				return { success: false, error: `You can only have ${MAX_PER_LIST} entries in your ${body.list_type} list` };
			}

			// Idempotent: skip if already exists
			const existing = await db
				.select({ id: userItemListsTable.id })
				.from(userItemListsTable)
				.where(
					and(
						eq(userItemListsTable.user_id, userId),
						eq(userItemListsTable.list_type, body.list_type),
						body.item_id
							? eq(userItemListsTable.item_id, body.item_id)
							: eq(userItemListsTable.currency_id, body.currency_id!),
					),
				)
				.limit(1);

			if (existing.length > 0) {
				return { success: true, data: { id: existing[0].id }, duplicate: true };
			}

			const [inserted] = await db
				.insert(userItemListsTable)
				.values({
					user_id: userId,
					list_type: body.list_type,
					item_id: body.item_id ?? null,
					currency_id: body.currency_id ?? null,
				})
				.returning({ id: userItemListsTable.id });

			return { success: true, data: { id: inserted.id } };
		},
		{
			body: t.Object({
				list_type: t.Union([t.Literal('have'), t.Literal('want')]),
				item_id: t.Optional(t.String()),
				currency_id: t.Optional(t.String()),
			}),
			detail: { description: 'Add an item or currency to a list' }
		},
	)

	// DELETE /lists/:id — remove an entry (must be owned by the requester)
	.delete(
		'/:id',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			const result = await db
				.delete(userItemListsTable)
				.where(
					and(
						eq(userItemListsTable.id, params.id),
						eq(userItemListsTable.user_id, session.user.id),
					),
				)
				.returning({ id: userItemListsTable.id });

			if (result.length === 0) {
				set.status = 404;
				return { success: false, error: 'Entry not found' };
			}

			return { success: true };
		},
		{ params: t.Object({ id: t.String() }), detail: { description: 'Remove an entry from a list' } },
	)

	// GET /lists/search — reverse search: find users who have/want a specific item or currency
	.get(
		'/search',
		async ({ query, session, set }) => {
			if (query.list_type !== 'have' && query.list_type !== 'want') {
				set.status = 400;
				return { success: false, error: 'list_type must be have or want' };
			}
			if ((!!query.item_id) === (!!query.currency_id)) {
				set.status = 400;
				return { success: false, error: 'Provide exactly one of item_id or currency_id' };
			}

			const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
			const offset = Math.max(Number(query.offset) || 0, 0);

			const filterCondition = query.item_id
				? eq(userItemListsTable.item_id, query.item_id)
				: eq(userItemListsTable.currency_id, query.currency_id!);

			// Total count (for pagination)
			const [totalRow] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(userItemListsTable)
				.where(
					and(
						eq(userItemListsTable.list_type, query.list_type),
						filterCondition,
						// Exclude self if logged in
						session?.user?.id
							? sql`${userItemListsTable.user_id} <> ${session.user.id}`
							: sql`1=1`,
					),
				);
			const total = totalRow?.count ?? 0;

			// Active users first, dead accounts buried
			const rows = await db
				.select({
					user_id: user.id,
					username: userProfilesTable.username,
					display_name: user.name,
					avatar_url: user.image,
					last_active_at: usersActivityTable.last_activity_at,
					added_at: userItemListsTable.created_at,
				})
				.from(userItemListsTable)
				.innerJoin(user, eq(userItemListsTable.user_id, user.id))
				.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
				.leftJoin(usersActivityTable, eq(user.id, usersActivityTable.user_id))
				.where(
					and(
						eq(userItemListsTable.list_type, query.list_type),
						filterCondition,
						session?.user?.id
							? sql`${userItemListsTable.user_id} <> ${session.user.id}`
							: sql`1=1`,
					),
				)
				.orderBy(
					sql`${usersActivityTable.last_activity_at} DESC NULLS LAST`,
					desc(userItemListsTable.created_at),
				)
				.limit(limit)
				.offset(offset);

			return {
				success: true,
				data: rows.map((r) => ({
					user_id: r.user_id,
					username: r.username,
					display_name: r.display_name,
					avatar_url: r.avatar_url ?? null,
					last_active_at: r.last_active_at?.toISOString() ?? null,
					added_at: r.added_at.toISOString(),
				})),
				pagination: { total, limit, offset, hasMore: offset + limit < total },
			};
		},
		{
			query: t.Object({
				list_type: t.String(),
				item_id: t.Optional(t.String()),
				currency_id: t.Optional(t.String()),
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
			detail: { description: 'Find users who have or want an item' }
		},
	);
