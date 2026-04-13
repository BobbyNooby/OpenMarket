import satori from 'satori';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getSiteConfig } from './site-config';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

const fontsDir = resolve(process.cwd(), 'assets/fonts');
const [interBold, interRegular] = await Promise.all([
	readFile(resolve(fontsDir, 'Inter-Bold.ttf')),
	readFile(resolve(fontsDir, 'Inter-Regular.ttf')),
]);

const fonts = [
	{ name: 'Inter', data: interBold, weight: 700 as const },
	{ name: 'Inter', data: interRegular, weight: 400 as const },
];

async function fetchImageAsPngDataUri(url: string): Promise<string | null> {
	try {
		const base = process.env.PUBLIC_API_URL || `http://localhost:${process.env.API_PORT || 3000}`;
		const fullUrl = url.startsWith('http') ? url : `${base}${url}`;
		const res = await fetch(fullUrl);
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		const pngBuf = await sharp(buf).png().toBuffer();
		return `data:image/png;base64,${pngBuf.toString('base64')}`;
	} catch {
		return null;
	}
}

interface ListingPreviewData {
	requested_name: string;
	requested_image_url: string | null;
	order_type: 'buy' | 'sell';
	amount: number;
	paying_type: 'each' | 'total';
	author_username: string;
	author_image: string | null;
	offered: { name: string; amount: number; image_url: string | null }[];
}

// Helper to build satori element trees without JSX
function h(type: string, style: Record<string, unknown>, children: unknown): any {
	return { type, props: { style, children } };
}

function hImg(src: string, size: number): any {
	return { type: 'img', props: { src, width: size, height: size, style: { borderRadius: 8, objectFit: 'cover' } } };
}

// Item icon with amount badge (mimics ItemButton)
function itemIcon(imageUri: string | null, amount: number): any {
	if (imageUri) {
		return h('div', { display: 'flex', position: 'relative', width: 80, height: 80 }, [
			hImg(imageUri, 80),
			// Amount badge
			h('div', {
				position: 'absolute', right: 2, top: 2,
				width: 26, height: 26, borderRadius: 13,
				background: '#6366f1', color: '#fff',
				fontSize: 13, fontWeight: 700,
				display: 'flex', alignItems: 'center', justifyContent: 'center',
			}, `${amount}`),
		]);
	}
	// No image fallback
	return h('div', {
		display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
		width: 80, height: 80, borderRadius: 8,
		background: '#1e1b3a', color: '#64748b', fontSize: 12,
	}, [
		h('div', { fontSize: 28, marginBottom: 2 }, '?'),
		h('div', { fontSize: 11, color: '#475569' }, `${amount}x`),
	]);
}

export async function renderListingPreview(listing: ListingPreviewData): Promise<Buffer> {
	const config = getSiteConfig();
	const siteName = config.site_name || 'OpenMarket';

	// Fetch images in parallel
	const [mainImageUri, ...offeredImageUris] = await Promise.all([
		listing.requested_image_url ? fetchImageAsPngDataUri(listing.requested_image_url) : Promise.resolve(null),
		...listing.offered.slice(0, 4).map(o =>
			o.image_url ? fetchImageAsPngDataUri(o.image_url) : Promise.resolve(null)
		),
	]);

	const isBuy = listing.order_type === 'buy';
	const badgeColor = isBuy ? '#22c55e' : '#f59e0b';
	const badgeText = isBuy ? 'Buying' : 'Selling';

	// Arrow SVG path
	const arrowPath = isBuy
		? 'M10 19l-7-7m0 0l7-7m-7 7h18'  // left arrow
		: 'M14 5l7 7m0 0l-7 7m7-7H3';     // right arrow

	// Build offered item icons
	const offeredIcons = listing.offered.slice(0, 4).map((o, i) =>
		itemIcon(offeredImageUris[i] ?? null, o.amount)
	);

	const element = h('div', {
		display: 'flex', flexDirection: 'column',
		width: CARD_WIDTH, height: CARD_HEIGHT,
		background: '#0f0d1e',
		fontFamily: 'Inter',
		padding: 48,
	}, [
		// Card container with border
		h('div', {
			display: 'flex', flexDirection: 'column',
			flex: 1,
			background: '#161430',
			borderRadius: 16,
			border: '1px solid #2a2750',
			padding: '32px 36px',
		}, [
			// Header: item name + badge
			h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }, [
				h('div', { color: '#f1f5f9', fontSize: 36, fontWeight: 700 }, listing.requested_name),
				h('div', {
					background: badgeColor, color: '#fff',
					fontSize: 16, fontWeight: 700,
					padding: '5px 14px', borderRadius: 6,
				}, badgeText),
			]),

			// Item icons row: requested → arrow → offered
			h('div', { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }, [
				// Requested item
				itemIcon(mainImageUri, listing.amount),

				// Arrow
				h('div', { display: 'flex', color: '#475569', width: 28, height: 28 }, [
					{
						type: 'svg',
						props: {
							width: 28, height: 28, viewBox: '0 0 24 24',
							fill: 'none', stroke: '#475569', strokeWidth: 2,
							strokeLinecap: 'round', strokeLinejoin: 'round',
							children: { type: 'path', props: { d: arrowPath } },
						},
					},
				]),

				// Offered items
				...offeredIcons.length > 0
					? offeredIcons
					: [h('div', {
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						width: 80, height: 80, borderRadius: 8,
						border: '2px dashed #2a2750', color: '#475569', fontSize: 32,
					}, '?')],
			]),

			// Stock info
			h('div', { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }, [
				h('div', { color: '#64748b', fontSize: 16 }, `Stock: ${listing.amount}`),
				h('div', {
					border: '1px solid #2a2750', borderRadius: 4,
					padding: '2px 8px', color: '#64748b', fontSize: 14,
				}, listing.paying_type),
			]),

			// Separator
			h('div', { width: '100%', height: 1, background: '#2a2750', marginBottom: 20 }, ''),

			// Footer: author + site name
			h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
				h('div', { color: '#64748b', fontSize: 18 }, `@${listing.author_username}`),
				h('div', { color: '#6366f1', fontSize: 18, fontWeight: 700 }, siteName),
			]),
		]),
	]);

	const svg = await satori(element as any, {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		fonts,
	});

	return sharp(Buffer.from(svg)).png().toBuffer();
}
