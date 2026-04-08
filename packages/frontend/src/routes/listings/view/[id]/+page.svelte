<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';

	let { data } = $props();

	const listing = $derived(transformListing(data.listing as any));
</script>

<svelte:head>
	<title>{(listing as TransformedListing | null)?.requested_item?.name ?? (listing as TransformedListing | null)?.requested_currency?.name ?? 'Listing'} · {data.siteConfig?.site_name ?? 'OpenMarket'}</title>
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
