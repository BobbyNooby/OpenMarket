import { Elysia, t } from 'elysia';
import { db } from '../../db/db';
import {
	uploadsTable,
	itemsTable,
	currenciesTable,
	userProfilesTable,
	siteAssetsTable,
	siteConfigTable,
	user,
} from '../../db/schemas';
import { eq, desc, sql, and, lt, count as countFn } from 'drizzle-orm';
import { authMiddleware } from '../../middleware/rbac';
import { logAuditEvent } from '../../services/audit';
import { join, resolve } from 'node:path';
import { unlink } from 'node:fs/promises';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

// Fixed set of site asset slots — add new slots here as needed
const SITE_ASSET_SLOTS = [
	{ slot: 'hero_background', label: 'Hero Background', description: 'Homepage hero section background' },
	{ slot: 'login_illustration', label: 'Login Illustration', description: 'Shown on the login page' },
	{ slot: 'empty_listings', label: 'Empty Listings', description: 'Shown when a user has no listings' },
	{ slot: 'email_header', label: 'Email Header', description: 'Header banner for notification emails' },
] as const;

function requireMediaPermission(session: any, set: any) {
	if (!session.permissions.includes('admin:settings')) {
		set.status = 403;
		return { success: false, error: 'Forbidden' };
	}
	return null;
}

// Look up every table that might reference an upload by its URL
async function findReferences(upload: { id: string; filename: string }) {
	const urlPattern = `%${upload.filename}`;

	const [items, currencies, avatars, siteConfigs, assets] = await Promise.all([
		db.select({ id: itemsTable.id, name: itemsTable.name })
			.from(itemsTable)
			.where(sql`${itemsTable.image_url} LIKE ${urlPattern}`),
		db.select({ id: currenciesTable.id, name: currenciesTable.name })
			.from(currenciesTable)
			.where(sql`${currenciesTable.image_url} LIKE ${urlPattern}`),
		db.select({ userId: userProfilesTable.userId, username: userProfilesTable.username })
			.from(userProfilesTable)
			.where(sql`${userProfilesTable.avatar_url} LIKE ${urlPattern}`),
		db.select({ key: siteConfigTable.key })
			.from(siteConfigTable)
			.where(sql`${siteConfigTable.value} LIKE ${urlPattern}`),
		db.select({ slot: siteAssetsTable.slot })
			.from(siteAssetsTable)
			.where(eq(siteAssetsTable.upload_id, upload.id)),
	]);

	return {
		items: items.map(r => ({ id: r.id, name: r.name })),
		currencies: currencies.map(r => ({ id: r.id, name: r.name })),
		avatars: avatars.map(r => ({ user_id: r.userId, username: r.username })),
		site_config: siteConfigs.map(r => ({ key: r.key })),
		site_assets: assets.map(r => ({ slot: r.slot })),
		total: items.length + currencies.length + avatars.length + siteConfigs.length + assets.length,
	};
}

export const adminMediaRoutes = new Elysia()
	.use(authMiddleware)

	// GET /admin/media — paginated upload list with optional filters
	.get(
		'/media',
		async ({ query, session, set }) => {
			const denied = requireMediaPermission(session, set);
			if (denied) return denied;

			const limit = Math.min(parseInt(query.limit ?? '50', 10) || 50, 100);
			const offset = parseInt(query.offset ?? '0', 10) || 0;

			const rows = await db
				.select({
					id: uploadsTable.id,
					filename: uploadsTable.filename,
					mime_type: uploadsTable.mime_type,
					size_bytes: uploadsTable.size_bytes,
					width: uploadsTable.width,
					height: uploadsTable.height,
					created_at: uploadsTable.created_at,
					user_id: uploadsTable.user_id,
					username: userProfilesTable.username,
				})
				.from(uploadsTable)
				.leftJoin(userProfilesTable, eq(uploadsTable.user_id, userProfilesTable.userId))
				.orderBy(desc(uploadsTable.created_at))
				.limit(limit)
				.offset(offset);

			const [{ n }] = await db.select({ n: countFn() }).from(uploadsTable);

			return {
				success: true,
				data: rows.map(r => ({
					...r,
					url: `/uploads/${r.filename}`,
					created_at: r.created_at.toISOString(),
				})),
				total: n,
			};
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
			detail: { description: 'List uploaded files with pagination' }
		},
	)

	// GET /admin/media/stats — total count and size
	.get('/media/stats', async ({ session, set }) => {
		const denied = requireMediaPermission(session, set);
		if (denied) return denied;

		const [stats] = await db
			.select({
				count: countFn(),
				total_bytes: sql<number>`COALESCE(SUM(${uploadsTable.size_bytes}), 0)::int`,
			})
			.from(uploadsTable);

		return { success: true, data: stats };
	}, { detail: { description: 'Get upload count and total size' } })

	// GET /admin/media/:id — single upload detail + references
	.get(
		'/media/:id',
		async ({ params, session, set }) => {
			const denied = requireMediaPermission(session, set);
			if (denied) return denied;

			const [upload] = await db
				.select()
				.from(uploadsTable)
				.where(eq(uploadsTable.id, params.id));

			if (!upload) {
				set.status = 404;
				return { success: false, error: 'Upload not found' };
			}

			const refs = await findReferences(upload);
			const [uploader] = await db
				.select({ name: user.name, username: userProfilesTable.username })
				.from(user)
				.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
				.where(eq(user.id, upload.user_id));

			return {
				success: true,
				data: {
					...upload,
					url: `/uploads/${upload.filename}`,
					created_at: upload.created_at.toISOString(),
					uploader: uploader ? { name: uploader.name, username: uploader.username } : null,
					references: refs,
				},
			};
		},
		{ params: t.Object({ id: t.String() }), detail: { description: 'Get upload details and references' } },
	)

	// DELETE /admin/media/:id — delete upload with cascade
	.delete(
		'/media/:id',
		async ({ params, session, set }) => {
			const denied = requireMediaPermission(session, set);
			if (denied) return denied;

			const [upload] = await db
				.select()
				.from(uploadsTable)
				.where(eq(uploadsTable.id, params.id));

			if (!upload) {
				set.status = 404;
				return { success: false, error: 'Upload not found' };
			}

			const refs = await findReferences(upload);
			const urlPattern = `%${upload.filename}`;

			// Clear references before deleting
			await Promise.all([
				refs.items.length > 0
					? db.update(itemsTable).set({ image_url: null }).where(sql`${itemsTable.image_url} LIKE ${urlPattern}`)
					: Promise.resolve(),
				refs.currencies.length > 0
					? db.update(currenciesTable).set({ image_url: null }).where(sql`${currenciesTable.image_url} LIKE ${urlPattern}`)
					: Promise.resolve(),
				refs.avatars.length > 0
					? db.update(userProfilesTable).set({ avatar_url: null }).where(sql`${userProfilesTable.avatar_url} LIKE ${urlPattern}`)
					: Promise.resolve(),
				refs.site_config.length > 0
					? db.update(siteConfigTable).set({ value: '' }).where(sql`${siteConfigTable.value} LIKE ${urlPattern}`)
					: Promise.resolve(),
				refs.site_assets.length > 0
					? db.delete(siteAssetsTable).where(eq(siteAssetsTable.upload_id, upload.id))
					: Promise.resolve(),
			]);

			// Delete the DB row
			await db.delete(uploadsTable).where(eq(uploadsTable.id, params.id));

			// Delete from disk
			try {
				await unlink(join(UPLOAD_DIR, upload.filename));
			} catch {
				// file already gone, that's fine
			}

			await logAuditEvent(
				session.user!.id,
				'media:delete',
				'upload',
				params.id,
				{ filename: upload.filename, refs_cleared: refs.total },
			);

			return { success: true, refs_cleared: refs.total };
		},
		{ params: t.Object({ id: t.String() }), detail: { description: 'Delete an upload and clear references' } },
	)

	// POST /admin/media/cleanup-orphans — delete uploads with no references
	.post('/media/cleanup-orphans', async ({ session, set }) => {
		const denied = requireMediaPermission(session, set);
		if (denied) return denied;

		// Only clean up files older than 1 hour to avoid racing with in-progress uploads
		const cutoff = new Date(Date.now() - 60 * 60 * 1000);

		const candidates = await db
			.select({ id: uploadsTable.id, filename: uploadsTable.filename })
			.from(uploadsTable)
			.where(lt(uploadsTable.created_at, cutoff));

		let deleted = 0;
		for (const upload of candidates) {
			const refs = await findReferences(upload);
			if (refs.total === 0) {
				await db.delete(uploadsTable).where(eq(uploadsTable.id, upload.id));
				try {
					await unlink(join(UPLOAD_DIR, upload.filename));
				} catch { /* already gone */ }
				deleted++;
			}
		}

		await logAuditEvent(
			session.user!.id,
			'media:cleanup',
			'upload',
			'orphans',
			{ deleted },
		);

		return { success: true, deleted };
	}, { detail: { description: 'Delete unreferenced orphan uploads' } })

	// GET /admin/media/site-assets — list all slots with current values
	.get('/media/site-assets', async ({ session, set }) => {
		const denied = requireMediaPermission(session, set);
		if (denied) return denied;

		const rows = await db.select().from(siteAssetsTable);
		const bySlot = new Map(rows.map(r => [r.slot, r]));

		const slots = SITE_ASSET_SLOTS.map(s => ({
			...s,
			url: bySlot.get(s.slot)?.url ?? null,
			upload_id: bySlot.get(s.slot)?.upload_id ?? null,
		}));

		return { success: true, data: slots };
	}, { detail: { description: 'List all site asset slots' } })

	// PUT /admin/media/site-assets/:slot — assign an upload to a slot
	.put(
		'/media/site-assets/:slot',
		async ({ params, body, session, set }) => {
			const denied = requireMediaPermission(session, set);
			if (denied) return denied;

			const validSlot = SITE_ASSET_SLOTS.find(s => s.slot === params.slot);
			if (!validSlot) {
				set.status = 400;
				return { success: false, error: 'Invalid slot' };
			}

			// Verify the upload exists
			const [upload] = await db
				.select({ id: uploadsTable.id, filename: uploadsTable.filename })
				.from(uploadsTable)
				.where(eq(uploadsTable.id, body.upload_id));

			if (!upload) {
				set.status = 404;
				return { success: false, error: 'Upload not found' };
			}

			await db
				.insert(siteAssetsTable)
				.values({
					slot: params.slot,
					upload_id: upload.id,
					url: `/uploads/${upload.filename}`,
				})
				.onConflictDoUpdate({
					target: siteAssetsTable.slot,
					set: {
						upload_id: upload.id,
						url: `/uploads/${upload.filename}`,
						updated_at: new Date(),
					},
				});

			await logAuditEvent(
				session.user!.id,
				'media:assign_asset',
				'site_asset',
				params.slot,
				{ upload_id: upload.id },
			);

			return { success: true };
		},
		{
			params: t.Object({ slot: t.String() }),
			body: t.Object({ upload_id: t.String() }),
			detail: { description: 'Assign an upload to a site asset slot' }
		},
	)

	// DELETE /admin/media/site-assets/:slot — clear a slot
	.delete(
		'/media/site-assets/:slot',
		async ({ params, session, set }) => {
			const denied = requireMediaPermission(session, set);
			if (denied) return denied;

			await db.delete(siteAssetsTable).where(eq(siteAssetsTable.slot, params.slot));

			await logAuditEvent(
				session.user!.id,
				'media:clear_asset',
				'site_asset',
				params.slot,
			);

			return { success: true };
		},
		{ params: t.Object({ slot: t.String() }), detail: { description: 'Clear a site asset slot' } },
	);
