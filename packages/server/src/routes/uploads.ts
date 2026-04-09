import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { uploadsTable } from '../db/schemas';
import { and, count, eq, gt } from 'drizzle-orm';
import { authMiddleware } from '../middleware/rbac';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 4000;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20;

// Make sure the upload folder exists on startup so the first write doesn't fail
await mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

// Only allow [a-z0-9-] + .webp in served filenames so there's no path traversal
const SAFE_FILENAME = /^[a-z0-9-]+\.webp$/i;

export const uploadsRoutes = new Elysia({ prefix: '/uploads' })
	.use(authMiddleware)

	// POST /uploads/image — upload a single image
	.post(
		'/image',
		async ({ body, session, set }) => {
			if (!session.user) { set.status = 401; return { success: false, error: 'Unauthorized' }; }

			const file = body.file;
			if (!file) { set.status = 400; return { success: false, error: 'No file provided' }; }

			if (file.size > MAX_SIZE_BYTES) {
				set.status = 413;
				return { success: false, error: `File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit` };
			}
			if (!ALLOWED_MIME.has(file.type)) {
				set.status = 415;
				return { success: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
			}

			// Rate limit: count this user's uploads in the last hour
			const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
			const [{ n }] = await db
				.select({ n: count() })
				.from(uploadsTable)
				.where(
					and(
						eq(uploadsTable.user_id, session.user.id),
						gt(uploadsTable.created_at, windowStart),
					),
				);
			if (n >= RATE_LIMIT_MAX) {
				set.status = 429;
				return { success: false, error: `Upload limit reached (${RATE_LIMIT_MAX}/hour)` };
			}

			let buffer: Buffer;
			let width: number;
			let height: number;
			try {
				// Decode to validate it's actually an image, check dimensions, then re-encode as WebP
				const input = Buffer.from(await file.arrayBuffer());
				const pipeline = sharp(input, { failOn: 'error' });
				const metadata = await pipeline.metadata();
				width = metadata.width ?? 0;
				height = metadata.height ?? 0;
				if (!width || !height) {
					set.status = 400;
					return { success: false, error: 'Could not read image dimensions' };
				}
				if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
					set.status = 400;
					return { success: false, error: `Image exceeds ${MAX_DIMENSION}x${MAX_DIMENSION} limit` };
				}
				buffer = await pipeline.webp({ quality: 85 }).toBuffer();
			} catch {
				set.status = 400;
				return { success: false, error: 'Invalid or corrupted image file' };
			}

			const id = randomUUID();
			const filename = `${id}.webp`;
			const diskPath = join(UPLOAD_DIR, filename);

			try {
				await writeFile(diskPath, buffer);
			} catch (err) {
				console.error('Upload write failed:', err);
				set.status = 500;
				return { success: false, error: 'Failed to save file' };
			}

			const [row] = await db
				.insert(uploadsTable)
				.values({
					id,
					user_id: session.user.id,
					filename,
					mime_type: 'image/webp',
					size_bytes: buffer.length,
					width,
					height,
				})
				.returning();

			return {
				success: true,
				data: {
					id: row.id,
					url: `/uploads/${filename}`,
					width: row.width,
					height: row.height,
					size_bytes: row.size_bytes,
				},
			};
		},
		{
			body: t.Object({
				file: t.File({ maxSize: MAX_SIZE_BYTES }),
			}),
		},
	)

	// GET /uploads/:filename — stream a stored file with long-lived cache headers
	.get(
		'/:filename',
		async ({ params, set }) => {
			if (!SAFE_FILENAME.test(params.filename)) {
				set.status = 400;
				return { success: false, error: 'Invalid filename' };
			}
			const diskPath = join(UPLOAD_DIR, params.filename);
			try {
				await stat(diskPath);
			} catch {
				set.status = 404;
				return { success: false, error: 'Not found' };
			}
			const buffer = await readFile(diskPath);
			return new Response(buffer, {
				headers: {
					'content-type': 'image/webp',
					'cache-control': 'public, max-age=31536000, immutable',
				},
			});
		},
		{ params: t.Object({ filename: t.String() }) },
	);
