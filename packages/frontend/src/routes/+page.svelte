<script lang="ts">
	import { ListingCard, Input } from '$lib/shared/components';
	import { api } from '$lib/api/client';
	import { onMount } from 'svelte';

	let { data } = $props();
	let searchQuery = $state('');

	// All loaded listings
	let allListings = $state<any[]>(data.listings || []);
	let loading = $state(false);
	let hasMore = $state(data.pagination?.hasMore ?? false);
	let offset = $state(data.listings?.length || 0);
	const limit = 12;

	// Transform listings for display
	function transformListing(listing: any) {
		return {
			id: listing.id,
			created_at: listing.created_at,
			author_id: listing.author.id,
			requested_item_id: listing.requested_item?.id,
			requested_currency_id: listing.requested_currency?.id,
			amount: listing.amount,
			order_type: listing.order_type,
			paying_type: listing.paying_type,
			offered_items: listing.offered_items,
			offered_currencies: listing.offered_currencies,
			_author: listing.author,
			_requested_item: listing.requested_item,
			_requested_currency: listing.requested_currency
		};
	}

	const listings = $derived(allListings.map(transformListing));

	// Filter orders by type
	const buyOrders = $derived(listings.filter((o: any) => o.order_type === 'buy'));
	const sellOrders = $derived(listings.filter((o: any) => o.order_type === 'sell'));

	// Load more listings
	async function loadMore() {
		if (loading || !hasMore) return;

		loading = true;
		try {
			const result = await api.listings.get({
				query: { limit: String(limit), offset: String(offset) }
			});

			if (result.data?.success && result.data.data) {
				// Deduplicate by id to prevent key conflicts
				const existingIds = new Set(allListings.map((l: any) => l.id));
				const newListings = result.data.data.filter((l: any) => !existingIds.has(l.id));
				allListings = [...allListings, ...newListings];
				offset += result.data.data.length;
				hasMore = result.data.pagination?.hasMore ?? false;
			}
		} catch (err) {
			console.error('Failed to load more listings:', err);
		} finally {
			loading = false;
		}
	}

	// Intersection observer for infinite scroll
	let sentinelRef: HTMLDivElement;

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

	// Handle contact click
	function handleContact(order: any) {
		alert(`Contact ${order._author.display_name} (@${order._author.username}) about this order!`);
	}
</script>

<div class="min-h-screen text-[var(--color-text)]">
	<!-- Header Section with lighter background -->
	<div class="bg-[var(--color-surface)] py-32 shadow-[var(--shadow-sm)]">
		<div class="mx-auto max-w-7xl px-8">
			<div class="text-center">
				<h1 class="mb-6 text-7xl font-bold text-[var(--color-primary)]">OpenMarket</h1>
				<p class="mb-8 text-xl text-[var(--color-textSecondary)]">
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

	<!-- Latest Orders Section -->
	<div class="px-8 py-12">
		<div class="mx-auto max-w-7xl">
			<h2 class="mb-8 text-3xl font-bold text-[var(--color-text)]">Latest Orders</h2>

			{#if data.error}
				<div class="rounded-lg bg-red-100 p-4 text-red-700">
					Error loading listings: {data.error}
				</div>
			{:else if listings.length === 0}
				<div class="py-12 text-center">
					<p class="text-lg text-[var(--color-textSecondary)]">No listings found.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- Buy Orders Column -->
					<div>
						<h3
							class="mb-4 rounded-t-[var(--radius-lg)] bg-[var(--color-success)] p-3 text-center text-xl font-semibold text-white"
						>
							🛒 Buy Orders ({buyOrders.length})
						</h3>
						<div class="space-y-4">
							{#each buyOrders as order (order.id)}
								<ListingCard
									{order}
									author={order._author}
									requestedItem={order._requested_item}
									requestedCurrency={order._requested_currency}
									onContact={() => handleContact(order)}
								/>
							{/each}
							{#if buyOrders.length === 0}
								<p class="py-4 text-center text-[var(--color-textSecondary)]">No buy orders</p>
							{/if}
						</div>
					</div>

					<!-- Sell Orders Column -->
					<div>
						<h3
							class="mb-4 rounded-t-[var(--radius-lg)] bg-[var(--color-warning)] p-3 text-center text-xl font-semibold text-white"
						>
							💰 Sell Orders ({sellOrders.length})
						</h3>
						<div class="space-y-4">
							{#each sellOrders as order (order.id)}
								<ListingCard
									{order}
									author={order._author}
									requestedItem={order._requested_item}
									requestedCurrency={order._requested_currency}
									onContact={() => handleContact(order)}
								/>
							{/each}
							{#if sellOrders.length === 0}
								<p class="py-4 text-center text-[var(--color-textSecondary)]">No sell orders</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Load more sentinel / Loading indicator -->
				<div bind:this={sentinelRef} class="mt-8 flex justify-center">
					{#if loading}
						<div class="flex items-center gap-2 text-[var(--color-textSecondary)]">
							<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
									fill="none"
								/>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							<span>Loading more...</span>
						</div>
					{:else if !hasMore && listings.length > 0}
						<p class="text-[var(--color-textSecondary)]">No more listings</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
