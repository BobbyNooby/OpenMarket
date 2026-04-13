import { apiFetch } from '$lib/api/fetch';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = url.origin;

	// Fetch public data for sitemap
	const [itemsRes, currenciesRes, listingsRes] = await Promise.all([
		apiFetch('/items').then(r => r.json()).catch(() => ({ data: [] })),
		apiFetch('/currencies').then(r => r.json()).catch(() => ({ data: [] })),
		apiFetch('/listings?limit=100&status=active').then(r => r.json()).catch(() => ({ data: [] })),
	]);

	const items = itemsRes?.data ?? [];
	const currencies = currenciesRes?.data ?? [];
	const listings = listingsRes?.data ?? [];

	const staticPages = [
		{ url: '/', priority: '1.0', changefreq: 'daily' },
		{ url: '/listings', priority: '0.9', changefreq: 'hourly' },
		{ url: '/items', priority: '0.8', changefreq: 'weekly' },
		{ url: '/login', priority: '0.3', changefreq: 'monthly' },
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
${listings.map((l: any) => `  <url>
    <loc>${baseUrl}/listings/view/${l.id}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
${items.map((i: any) => `  <url>
    <loc>${baseUrl}/listings?itemId=${i.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`).join('\n')}
${currencies.map((c: any) => `  <url>
    <loc>${baseUrl}/listings?currencyId=${c.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600',
		},
	});
};
