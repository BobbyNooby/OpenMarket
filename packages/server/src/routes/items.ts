import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { itemsTable, currenciesTable } from '../db/schemas';
import { eq, and, ne } from 'drizzle-orm';
import { authMiddleware } from '../middleware/rbac';

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/\[.*?\]/g, '') // Remove brackets and content
		.replace(/[^a-z0-9\s-]/g, '') // Remove special characters
		.trim()
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/-+/g, '-'); // Replace multiple hyphens with single
}

export const itemsRoutes = new Elysia({ prefix: '/items' })
	.use(authMiddleware)
	// Get all items
	.get('/', async () => {
		try {
			const items = await db.select().from(itemsTable);
			return { success: true, data: items };
		} catch (err: any) {
			console.error('Get items error:', err);
			return { success: false, error: err.message, status: 500 };
		}
	})
	// Get item by ID or slug
	.get(
		'/:id',
		async ({ params }) => {
			try {
				// Try to find by ID first (UUID format), then by slug
				const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

				const [item] = await db
					.select()
					.from(itemsTable)
					.where(
						isUUID
							? eq(itemsTable.id, params.id)
							: eq(itemsTable.slug, params.id)
					);

				if (!item) {
					return { success: false, error: 'Item not found', status: 404 };
				}

				return { success: true, data: item };
			} catch (err: any) {
				console.error('Get item error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	)
	// Create item
	.post(
		'/',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('item:create')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				// Check for duplicate name
				const [existing] = await db
					.select()
					.from(itemsTable)
					.where(eq(itemsTable.name, body.name));

				if (existing) {
					return { success: false, error: 'An item with this name already exists', status: 400 };
				}

				// Generate slug from name if not provided
				const slug = body.slug || generateSlug(body.name);

				const [item] = await db
					.insert(itemsTable)
					.values({
						name: body.name,
						slug,
						description: body.description,
						wiki_link: body.wiki_link,
						image_url: body.image_url,
						category_id: body.category_id
					})
					.returning();

				return { success: true, data: item };
			} catch (err: any) {
				console.error('Create item error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			body: t.Object({
				name: t.String(),
				slug: t.Optional(t.String()),
				description: t.Optional(t.String()),
				wiki_link: t.Optional(t.String()),
				image_url: t.Optional(t.String()),
				category_id: t.Optional(t.String())
			})
		}
	)
	// Update item
	.put(
		'/:id',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('item:update')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				// Check for duplicate name (excluding current item)
				const [existing] = await db
					.select()
					.from(itemsTable)
					.where(and(eq(itemsTable.name, body.name), ne(itemsTable.id, params.id)));

				if (existing) {
					return { success: false, error: 'An item with this name already exists', status: 400 };
				}

				// Auto-update slug when name changes
				const newSlug = generateSlug(body.name);

				const [item] = await db
					.update(itemsTable)
					.set({
						name: body.name,
						slug: newSlug,
						description: body.description,
						wiki_link: body.wiki_link,
						image_url: body.image_url,
						category_id: body.category_id ?? null
					})
					.where(eq(itemsTable.id, params.id))
					.returning();

				if (!item) {
					return { success: false, error: 'Item not found', status: 404 };
				}

				return { success: true, data: item };
			} catch (err: any) {
				console.error('Update item error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			}),
			body: t.Object({
				name: t.String(),
				description: t.Optional(t.String()),
				wiki_link: t.Optional(t.String()),
				image_url: t.Optional(t.String()),
				category_id: t.Optional(t.String())
			})
		}
	)
	// Delete item
	.delete(
		'/:id',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('item:delete')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				const [item] = await db
					.delete(itemsTable)
					.where(eq(itemsTable.id, params.id))
					.returning();

				if (!item) {
					return { success: false, error: 'Item not found', status: 404 };
				}

				return { success: true, data: item };
			} catch (err: any) {
				console.error('Delete item error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	);

export const currenciesRoutes = new Elysia({ prefix: '/currencies' })
	.use(authMiddleware)
	// Get all currencies
	.get('/', async () => {
		try {
			const currencies = await db.select().from(currenciesTable);
			return { success: true, data: currencies };
		} catch (err: any) {
			console.error('Get currencies error:', err);
			return { success: false, error: err.message, status: 500 };
		}
	})
	// Get currency by ID or slug
	.get(
		'/:id',
		async ({ params }) => {
			try {
				// Try to find by ID first (UUID format), then by slug
				const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

				const [currency] = await db
					.select()
					.from(currenciesTable)
					.where(
						isUUID
							? eq(currenciesTable.id, params.id)
							: eq(currenciesTable.slug, params.id)
					);

				if (!currency) {
					return { success: false, error: 'Currency not found', status: 404 };
				}

				return { success: true, data: currency };
			} catch (err: any) {
				console.error('Get currency error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	)
	// Create currency
	.post(
		'/',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('currency:create')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				// Check for duplicate name
				const [existing] = await db
					.select()
					.from(currenciesTable)
					.where(eq(currenciesTable.name, body.name));

				if (existing) {
					return { success: false, error: 'A currency with this name already exists', status: 400 };
				}

				// Generate slug from name if not provided
				const slug = body.slug || generateSlug(body.name);

				const [currency] = await db
					.insert(currenciesTable)
					.values({
						name: body.name,
						slug,
						description: body.description,
						wiki_link: body.wiki_link,
						image_url: body.image_url
					})
					.returning();

				return { success: true, data: currency };
			} catch (err: any) {
				console.error('Create currency error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			body: t.Object({
				name: t.String(),
				slug: t.Optional(t.String()),
				description: t.Optional(t.String()),
				wiki_link: t.Optional(t.String()),
				image_url: t.Optional(t.String())
			})
		}
	)
	// Update currency
	.put(
		'/:id',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('currency:update')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				// Check for duplicate name (excluding current currency)
				const [existing] = await db
					.select()
					.from(currenciesTable)
					.where(and(eq(currenciesTable.name, body.name), ne(currenciesTable.id, params.id)));

				if (existing) {
					return { success: false, error: 'A currency with this name already exists', status: 400 };
				}

				// Auto-update slug when name changes
				const newSlug = generateSlug(body.name);

				const [currency] = await db
					.update(currenciesTable)
					.set({
						name: body.name,
						slug: newSlug,
						description: body.description,
						wiki_link: body.wiki_link,
						image_url: body.image_url
					})
					.where(eq(currenciesTable.id, params.id))
					.returning();

				if (!currency) {
					return { success: false, error: 'Currency not found', status: 404 };
				}

				return { success: true, data: currency };
			} catch (err: any) {
				console.error('Update currency error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			}),
			body: t.Object({
				name: t.String(),
				description: t.Optional(t.String()),
				wiki_link: t.Optional(t.String()),
				image_url: t.Optional(t.String())
			})
		}
	)
	// Delete currency
	.delete(
		'/:id',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('currency:delete')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				const [currency] = await db
					.delete(currenciesTable)
					.where(eq(currenciesTable.id, params.id))
					.returning();

				if (!currency) {
					return { success: false, error: 'Currency not found', status: 404 };
				}

				return { success: true, data: currency };
			} catch (err: any) {
				console.error('Delete currency error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	);
