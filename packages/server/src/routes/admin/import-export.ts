import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import { itemsTable, currenciesTable, itemCategoriesTable } from '../../db/schemas';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../../middleware/rbac';
import { logAuditEvent } from '../../services/audit';

function generateSlug(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

export const adminImportExportRoutes = new Elysia({ detail: { tags: ['Admin'] } })
	.use(authMiddleware)

	// POST /admin/import — bulk import items and/or currencies from one JSON
	.post(
		'/import',
		async ({ body, session, set }) => {
			if (!session.permissions.includes('item:create')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			const items = body.items ?? [];
			const currencies = body.currencies ?? [];

			if (items.length === 0 && currencies.length === 0) {
				set.status = 400;
				return { success: false, error: 'Provide at least one item or currency' };
			}

			if (items.length > 500 || currencies.length > 500) {
				set.status = 400;
				return { success: false, error: 'Max 500 entries per type' };
			}

			const errors: string[] = [];
			let itemsImported = 0, itemsSkipped = 0;
			let currenciesImported = 0, currenciesSkipped = 0;

			// Resolve categories
			const categories = await db.select().from(itemCategoriesTable);
			const categoryBySlug = new Map(categories.map(c => [c.slug, c.id]));
			const categoryByName = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

			// Import items
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (!item.name || typeof item.name !== 'string') {
					errors.push(`Item row ${i + 1}: missing name`);
					itemsSkipped++;
					continue;
				}
				const slug = item.slug || generateSlug(item.name);
				const [existing] = await db.select({ id: itemsTable.id }).from(itemsTable).where(eq(itemsTable.slug, slug));
				if (existing) { itemsSkipped++; continue; }

				let categoryId: string | null = null;
				if (item.category) {
					categoryId = categoryBySlug.get(item.category) ?? categoryByName.get(item.category.toLowerCase()) ?? null;
				} else if (item.category_id) {
					categoryId = item.category_id;
				}

				try {
					await db.insert(itemsTable).values({
						name: item.name, slug,
						description: item.description || null,
						wiki_link: item.wiki_link || null,
						image_url: item.image_url || null,
						category_id: categoryId,
					});
					itemsImported++;
				} catch (err: any) {
					errors.push(`Item "${item.name}": ${err.message}`);
					itemsSkipped++;
				}
			}

			// Import currencies
			for (let i = 0; i < currencies.length; i++) {
				const curr = currencies[i];
				if (!curr.name || typeof curr.name !== 'string') {
					errors.push(`Currency row ${i + 1}: missing name`);
					currenciesSkipped++;
					continue;
				}
				const slug = curr.slug || generateSlug(curr.name);
				const [existing] = await db.select({ id: currenciesTable.id }).from(currenciesTable).where(eq(currenciesTable.slug, slug));
				if (existing) { currenciesSkipped++; continue; }

				try {
					await db.insert(currenciesTable).values({
						name: curr.name, slug,
						description: curr.description || null,
						wiki_link: curr.wiki_link || null,
						image_url: curr.image_url || null,
					});
					currenciesImported++;
				} catch (err: any) {
					errors.push(`Currency "${curr.name}": ${err.message}`);
					currenciesSkipped++;
				}
			}

			await logAuditEvent(session.user!.id, 'import:bulk', 'catalog', 'bulk', {
				items_imported: itemsImported, items_skipped: itemsSkipped,
				currencies_imported: currenciesImported, currencies_skipped: currenciesSkipped,
			});

			return {
				success: true,
				items_imported: itemsImported, items_skipped: itemsSkipped,
				currencies_imported: currenciesImported, currencies_skipped: currenciesSkipped,
				errors: errors.slice(0, 10),
			};
		},
		{
			body: t.Object({
				items: t.Optional(t.Array(t.Object({
					name: t.String(),
					slug: t.Optional(t.String()),
					description: t.Optional(t.String()),
					wiki_link: t.Optional(t.String()),
					image_url: t.Optional(t.String()),
					category: t.Optional(t.String()),
					category_id: t.Optional(t.String()),
				}))),
				currencies: t.Optional(t.Array(t.Object({
					name: t.String(),
					slug: t.Optional(t.String()),
					description: t.Optional(t.String()),
					wiki_link: t.Optional(t.String()),
					image_url: t.Optional(t.String()),
				}))),
			}),
			detail: { description: 'Bulk import items and currencies from JSON' },
		},
	)

	// GET /admin/export — download all items and currencies as one JSON file
	.get('/export', async ({ session, set }) => {
		if (!session.permissions.includes('item:read')) {
			set.status = 403;
			return { success: false, error: 'Forbidden' };
		}

		const [items, currencies] = await Promise.all([
			db.select({
				name: itemsTable.name,
				slug: itemsTable.slug,
				description: itemsTable.description,
				wiki_link: itemsTable.wiki_link,
				image_url: itemsTable.image_url,
				category: itemCategoriesTable.name,
			}).from(itemsTable).leftJoin(itemCategoriesTable, eq(itemsTable.category_id, itemCategoriesTable.id)),
			db.select({
				name: currenciesTable.name,
				slug: currenciesTable.slug,
				description: currenciesTable.description,
				wiki_link: currenciesTable.wiki_link,
				image_url: currenciesTable.image_url,
			}).from(currenciesTable),
		]);

		return new Response(JSON.stringify({ items, currencies }, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': 'attachment; filename="catalog.json"',
			},
		});
	}, { detail: { description: 'Export all items and currencies as JSON' } });
