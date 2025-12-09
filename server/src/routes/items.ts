import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { itemsTable, currenciesTable } from '../db/schemas';
import { eq } from 'drizzle-orm';

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
		'/:idOrSlug',
		async ({ params }) => {
			try {
				// Try to find by ID first (UUID format), then by slug
				const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.idOrSlug);

				const [item] = await db
					.select()
					.from(itemsTable)
					.where(
						isUUID
							? eq(itemsTable.id, params.idOrSlug)
							: eq(itemsTable.slug, params.idOrSlug)
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
				idOrSlug: t.String()
			})
		}
	)
	// Create item
	.post(
		'/',
		async ({ body }) => {
			try {
				// Generate slug from name if not provided
				const slug = body.slug || generateSlug(body.name);

				const [item] = await db
					.insert(itemsTable)
					.values({
						name: body.name,
						slug,
						description: body.description,
						wiki_link: body.wiki_link,
						image_url: body.image_url
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
				image_url: t.Optional(t.String())
			})
		}
	)
	// Update item
	.put(
		'/:id',
		async ({ params, body }) => {
			try {
				const [item] = await db
					.update(itemsTable)
					.set({
						name: body.name,
						description: body.description,
						wiki_link: body.wiki_link,
						image_url: body.image_url
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
				image_url: t.Optional(t.String())
			})
		}
	)
	// Delete item
	.delete(
		'/:id',
		async ({ params }) => {
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
		'/:idOrSlug',
		async ({ params }) => {
			try {
				// Try to find by ID first (UUID format), then by slug
				const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.idOrSlug);

				const [currency] = await db
					.select()
					.from(currenciesTable)
					.where(
						isUUID
							? eq(currenciesTable.id, params.idOrSlug)
							: eq(currenciesTable.slug, params.idOrSlug)
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
				idOrSlug: t.String()
			})
		}
	)
	// Create currency
	.post(
		'/',
		async ({ body }) => {
			try {
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
		async ({ params, body }) => {
			try {
				const [currency] = await db
					.update(currenciesTable)
					.set({
						name: body.name,
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
		async ({ params }) => {
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
