import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { itemCategoriesTable } from '../db/schemas';
import { eq, and, ne } from 'drizzle-orm';
import { authMiddleware } from '../middleware/rbac';

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/\[.*?\]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

export const categoriesRoutes = new Elysia({ prefix: '/categories' })
	.use(authMiddleware)
	// Get all categories
	.get('/', async () => {
		try {
			const categories = await db.select().from(itemCategoriesTable);
			return { success: true, data: categories };
		} catch (err: any) {
			console.error('Get categories error:', err);
			return { success: false, error: err.message, status: 500 };
		}
	})
	// Get category by ID or slug
	.get(
		'/:id',
		async ({ params }) => {
			try {
				const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

				const [category] = await db
					.select()
					.from(itemCategoriesTable)
					.where(
						isUUID
							? eq(itemCategoriesTable.id, params.id)
							: eq(itemCategoriesTable.slug, params.id)
					);

				if (!category) {
					return { success: false, error: 'Category not found', status: 404 };
				}

				return { success: true, data: category };
			} catch (err: any) {
				console.error('Get category error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	)
	// Create category (admin only)
	.post(
		'/',
		async ({ body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('item:create')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				const [existing] = await db
					.select()
					.from(itemCategoriesTable)
					.where(eq(itemCategoriesTable.name, body.name));

				if (existing) {
					return { success: false, error: 'A category with this name already exists', status: 400 };
				}

				const slug = generateSlug(body.name);

				const [category] = await db
					.insert(itemCategoriesTable)
					.values({
						name: body.name,
						slug,
						icon_url: body.icon_url
					})
					.returning();

				return { success: true, data: category };
			} catch (err: any) {
				console.error('Create category error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			body: t.Object({
				name: t.String(),
				icon_url: t.Optional(t.String())
			})
		}
	)
	// Update category
	.put(
		'/:id',
		async ({ params, body, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('item:update')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				const [existing] = await db
					.select()
					.from(itemCategoriesTable)
					.where(and(eq(itemCategoriesTable.name, body.name), ne(itemCategoriesTable.id, params.id)));

				if (existing) {
					return { success: false, error: 'A category with this name already exists', status: 400 };
				}

				const newSlug = generateSlug(body.name);

				const [category] = await db
					.update(itemCategoriesTable)
					.set({
						name: body.name,
						slug: newSlug,
						icon_url: body.icon_url
					})
					.where(eq(itemCategoriesTable.id, params.id))
					.returning();

				if (!category) {
					return { success: false, error: 'Category not found', status: 404 };
				}

				return { success: true, data: category };
			} catch (err: any) {
				console.error('Update category error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				name: t.String(),
				icon_url: t.Optional(t.String())
			})
		}
	)
	// Delete category (sets items' category_id to null)
	.delete(
		'/:id',
		async ({ params, session, set }) => {
			if (!session?.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }
			if (!session.permissions.includes('item:delete')) { set.status = 403; return { success: false, error: 'Forbidden' }; }
			try {
				const [category] = await db
					.delete(itemCategoriesTable)
					.where(eq(itemCategoriesTable.id, params.id))
					.returning();

				if (!category) {
					return { success: false, error: 'Category not found', status: 404 };
				}

				return { success: true, data: category };
			} catch (err: any) {
				console.error('Delete category error:', err);
				return { success: false, error: err.message, status: 500 };
			}
		},
		{
			params: t.Object({ id: t.String() })
		}
	);
