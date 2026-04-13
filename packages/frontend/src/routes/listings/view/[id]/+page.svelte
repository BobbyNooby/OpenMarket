<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';
	import { PUBLIC_API_URL } from '$env/static/public';

	let { data } = $props();

	const listing = $derived(transformListing(data.listing as any));
	const siteName = $derived(data.siteConfig?.site_name ?? 'OpenMarket');
	const itemName = $derived((listing as TransformedListing | null)?.requested_item?.name ?? (listing as TransformedListing | null)?.requested_currency?.name ?? 'Listing');
	const orderType = $derived((listing as TransformedListing | null)?.order_type === 'buy' ? 'Buying' : 'Selling');
	const ogDescription = $derived(`${orderType} ${(listing as TransformedListing | null)?.amount ?? 1}x ${itemName}`);
	const previewUrl = $derived(`${PUBLIC_API_URL}/listings/${data.listing?.id}/preview.png`);

	// Structured data for search engines
	const jsonLd = $derived(listing ? JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Offer',
		name: itemName,
		description: ogDescription,
		availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
		seller: {
			'@type': 'Person',
			name: listing.author?.username ?? 'unknown',
		},
	}) : null);
</script>

<svelte:head>
	<title>{itemName} · {siteName}</title>
	<meta name="description" content={ogDescription} />
	<meta property="og:title" content="{itemName} · {siteName}" />
	<meta property="og:description" content={ogDescription} />
	<meta property="og:image" content={previewUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	{#if jsonLd}
		{@html `<script type="application/ld+json">${jsonLd}</script>`}
	{/if}
</svelte:head>

<div class="min-h-screen text-foreground">
	<div class="mx-auto max-w-3xl px-8 py-10">
		<div class="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
			<a href="/" class="hover:text-primary">Home</a>
			<span>/</span>
			<a href="/listings" class="hover:text-primary">Listings</a>
		</div>

		{#if listing}
			<ListingCard order={listing} sessionUserId={data.session?.user?.id} />
		{:else}
			<p class="py-12 text-center text-muted-foreground">Listing data unavailable.</p>
		{/if}
	</div>
</div>
