<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { Input } from '$lib/components/ui/input';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';
	import { onMount } from 'svelte';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Coins from '@lucide/svelte/icons/coins';

	let { data } = $props();
	let searchQuery = $state('');

	let allListings = $state<any[]>([]);
	let loading = $state(false);
	let hasMore = $state(false);
	let offset = $state(0);
	const limit = 12;

	$effect(() => {
		if (data.listings) {
			allListings = data.listings;
			offset = data.listings.length;
		}
		hasMore = data.pagination?.hasMore ?? false;
	});

	const listings = $derived(
		(allListings || []).map(transformListing).filter((l): l is TransformedListing => l !== null)
	);

	const buyOrders = $derived(listings.filter((o) => o.order_type === 'buy'));
	const sellOrders = $derived(listings.filter((o) => o.order_type === 'sell'));

	async function loadMore() {
		if (loading || !hasMore) return;

		loading = true;
		try {
			const res = await fetch(`/api/listings?limit=${limit}&offset=${offset}`);
			const result = await res.json();

			if (result.success && result.data) {
				const existingIds = new Set(allListings.map((l: any) => l.id));
				const newListings = result.data.filter((l: any) => !existingIds.has(l.id));
				allListings = [...allListings, ...newListings];
				offset += result.data.length;
				hasMore = result.pagination?.hasMore ?? false;
			}
		} catch (err) {
			console.error('Failed to load more listings:', err);
		} finally {
			loading = false;
		}
	}

	let sentinelRef = $state<HTMLDivElement | null>(null);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					loadMore();
				}
			},
			{ rootMargin: '200px' }
		);

		if (sentinelRef) {
			observer.observe(sentinelRef);
		}

		return () => observer.disconnect();
	});

	function handleContact(order: TransformedListing) {
		alert(`Contact ${order.author.display_name} (@${order.author.username}) about this order!`);
	}
</script>

<div class="min-h-screen text-foreground">
	<div class="bg-card py-32 shadow-sm">
		<div class="mx-auto max-w-7xl px-8">
			<div class="text-center">
				<h1 class="mb-6 text-7xl font-bold text-primary">OpenMarket</h1>
				<p class="mb-8 text-xl text-muted-foreground">
					The marketplace for trading game items and currencies
				</p>
				<div class="mx-auto max-w-2xl">
					<Input
						type="text"
						placeholder="Search for items, users, or listings..."
						bind:value={searchQuery}
						class="text-center"
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="px-8 py-12">
		<div class="mx-auto max-w-7xl">
			<h2 class="mb-8 text-3xl font-bold text-foreground">Latest Orders</h2>

			{#if data.error}
				<div class="rounded-lg bg-destructive/10 p-4 text-destructive">
					Error loading listings: {data.error}
				</div>
			{:else if listings.length === 0}
				<div class="py-12 text-center">
					<p class="text-lg text-muted-foreground">No listings found.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div>
						<h3 class="mb-4 flex items-center justify-center gap-2 rounded-t-lg bg-green-500 p-3 text-xl font-semibold text-white">
							<ShoppingCart class="h-5 w-5" />
							Buy Orders ({buyOrders.length})
						</h3>
						<div class="space-y-4">
							{#each buyOrders as order (order.id)}
								<ListingCard {order} onContact={() => handleContact(order)} sessionUserId={data.session?.user?.id} />
							{/each}
							{#if buyOrders.length === 0}
								<p class="py-4 text-center text-muted-foreground">No buy orders</p>
							{/if}
						</div>
					</div>

					<div>
						<h3 class="mb-4 flex items-center justify-center gap-2 rounded-t-lg bg-amber-500 p-3 text-xl font-semibold text-white">
							<Coins class="h-5 w-5" />
							Sell Orders ({sellOrders.length})
						</h3>
						<div class="space-y-4">
							{#each sellOrders as order (order.id)}
								<ListingCard {order} onContact={() => handleContact(order)} sessionUserId={data.session?.user?.id} />
							{/each}
							{#if sellOrders.length === 0}
								<p class="py-4 text-center text-muted-foreground">No sell orders</p>
							{/if}
						</div>
					</div>
				</div>

				<div bind:this={sentinelRef} class="mt-8 flex justify-center">
					{#if loading}
						<div class="flex items-center gap-2 text-muted-foreground">
							<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
							<span>Loading more...</span>
						</div>
					{:else if !hasMore && listings.length > 0}
						<p class="text-muted-foreground">No more listings</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
