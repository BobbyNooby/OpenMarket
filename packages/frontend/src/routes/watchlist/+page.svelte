<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';
	import Heart from '@lucide/svelte/icons/heart';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	let savedIds = $state(new Set<string>((data.listings as { id: string }[]).map((l) => l.id)));

	const listings = $derived(
		((data.listings as unknown[]) ?? [])
			.map((l) => transformListing(l as Parameters<typeof transformListing>[0]))
			.filter((l): l is TransformedListing => l !== null)
			.filter((l) => savedIds.has(l.id))
	);

	function handleWatchlistToggle(listingId: string, saved: boolean) {
		if (saved) {
			savedIds.add(listingId);
		} else {
			savedIds.delete(listingId);
		}
		savedIds = new Set(savedIds);
	}
</script>

<div class="min-h-screen text-foreground">
	<div class="mx-auto max-w-7xl px-8 py-12">
		<div class="mb-8 flex items-center gap-3">
			<Heart class="h-8 w-8 text-rose-500" fill="currentColor" />
			<h1 class="text-3xl font-bold">{m.watchlist_title()}</h1>
		</div>

		{#if listings.length === 0}
			<div class="rounded-lg border border-border bg-card p-12 text-center">
				<Heart class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<h2 class="mb-2 text-xl font-semibold">{m.watchlist_empty()}</h2>
				<p class="text-muted-foreground">
					<a href="/listings" class="text-primary hover:underline">{m.watchlist_browse_listings()}</a>
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each listings as listing (listing.id)}
					<ListingCard
						order={listing}
						sessionUserId={data.session?.user?.id}
						watchlisted={true}
						onWatchlistToggle={handleWatchlistToggle}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
