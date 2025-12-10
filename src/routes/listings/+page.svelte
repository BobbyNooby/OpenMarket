<script lang="ts">
	import { ListingCard, Input } from '$lib/shared/components';
	import { api } from '$lib/api/client';
	import { onMount } from 'svelte';
	import type { Item } from '$lib/api/types';

	let { data } = $props();

	// Safe items array
	const items = $derived((data.items || []) as unknown as Item[]);

	// All loaded listings
	let allListings = $state<any[]>(data.listings || []);
	let loading = $state(false);
	let hasMore = $state(data.pagination?.hasMore ?? false);
	let offset = $state(data.listings?.length || 0);
	const limit = 20;

	// Filter state
	let searchQuery = $state('');
	let orderTypeFilter = $state<'all' | 'buy' | 'sell'>('all');
	let selectedItemId = $state<string | null>(null);

	// Transform listing for display
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

	// Apply filters (client-side filtering on loaded data)
	const filteredListings = $derived(() => {
		let result = listings;

		// Filter by order type
		if (orderTypeFilter !== 'all') {
			result = result.filter((l: any) => l.order_type === orderTypeFilter);
		}

		// Filter by selected item
		if (selectedItemId) {
			result = result.filter((l: any) => l.requested_item_id === selectedItemId);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(l: any) =>
					l._requested_item?.name?.toLowerCase().includes(query) ||
					l._requested_currency?.name?.toLowerCase().includes(query) ||
					l._author.display_name.toLowerCase().includes(query) ||
					l._author.username.toLowerCase().includes(query)
			);
		}

		return result;
	});

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

	function clearFilters() {
		searchQuery = '';
		orderTypeFilter = 'all';
		selectedItemId = null;
	}
</script>

<div class="min-h-screen text-[var(--color-text)]">
	<!-- Header -->
	<div class="bg-[var(--color-surface)] py-8 shadow-[var(--shadow-sm)]">
		<div class="mx-auto max-w-7xl px-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-4xl font-bold text-[var(--color-primary)]">All Listings</h1>
					<p class="mt-2 text-[var(--color-textSecondary)]">
						Browse and filter all marketplace listings
					</p>
				</div>
				<a
					href="/listings/new"
					class="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--color-primaryHover)]"
				>
					+ Create Listing
				</a>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-8 py-8">
		<div class="flex gap-8">
			<!-- Sidebar Filters -->
			<aside class="w-72 flex-shrink-0">
				<div
					class="sticky top-20 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
				>
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-lg font-semibold">Filters</h2>
						<button
							class="text-sm text-[var(--color-primary)] hover:underline"
							onclick={clearFilters}
						>
							Clear all
						</button>
					</div>

					<!-- Search -->
					<div class="mb-6">
						<Input
							type="search"
							placeholder="Search listings..."
							bind:value={searchQuery}
							label="Search"
						/>
					</div>

					<!-- Order Type Filter -->
					<div class="mb-6">
						<span class="mb-2 block text-sm font-semibold">Order Type</span>
						<div class="flex gap-2" role="group" aria-label="Order type filter">
							<button
								class="flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
								class:bg-[var(--color-primary)]={orderTypeFilter === 'all'}
								class:text-white={orderTypeFilter === 'all'}
								class:bg-[var(--color-background)]={orderTypeFilter !== 'all'}
								class:text-[var(--color-text)]={orderTypeFilter !== 'all'}
								onclick={() => (orderTypeFilter = 'all')}
							>
								All
							</button>
							<button
								class="flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
								class:bg-[var(--color-success)]={orderTypeFilter === 'buy'}
								class:text-white={orderTypeFilter === 'buy'}
								class:bg-[var(--color-background)]={orderTypeFilter !== 'buy'}
								class:text-[var(--color-text)]={orderTypeFilter !== 'buy'}
								onclick={() => (orderTypeFilter = 'buy')}
							>
								Buy
							</button>
							<button
								class="flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
								class:bg-[var(--color-warning)]={orderTypeFilter === 'sell'}
								class:text-white={orderTypeFilter === 'sell'}
								class:bg-[var(--color-background)]={orderTypeFilter !== 'sell'}
								class:text-[var(--color-text)]={orderTypeFilter !== 'sell'}
								onclick={() => (orderTypeFilter = 'sell')}
							>
								Sell
							</button>
						</div>
					</div>

					<!-- Item Filter -->
					<div class="mb-6">
						<label for="item-filter" class="mb-2 block text-sm font-semibold">Filter by Item</label>
						<select
							id="item-filter"
							class="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
							bind:value={selectedItemId}
						>
							<option value={null}>All Items</option>
							{#each items as item}
								<option value={item.id}>{item.name}</option>
							{/each}
						</select>
					</div>

					<!-- Quick Item Links -->
					<div>
						<span class="mb-2 block text-sm font-semibold">Popular Items</span>
						<div class="flex flex-wrap gap-2">
							{#each items.slice(0, 6) as item}
								<a
									href="/listings/{item.slug}"
									class="rounded-full bg-[var(--color-background)] px-3 py-1 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
								>
									{item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
								</a>
							{/each}
						</div>
					</div>
				</div>
			</aside>

			<!-- Listings Grid -->
			<main class="flex-1">
				<div class="mb-4 flex items-center justify-between">
					<p class="text-[var(--color-textSecondary)]">
						Showing {filteredListings().length} listing{filteredListings().length !== 1 ? 's' : ''}
						{#if data.pagination?.total}
							<span class="text-[var(--color-textTertiary)]">
								(loaded {allListings.length} of {data.pagination.total})
							</span>
						{/if}
					</p>
				</div>

				{#if filteredListings().length === 0}
					<div
						class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center"
					>
						<p class="text-lg text-[var(--color-textSecondary)]">No listings found.</p>
						<p class="mt-2 text-sm text-[var(--color-textTertiary)]">
							Try adjusting your filters or search query.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
						{#each filteredListings() as order (order.id)}
							<ListingCard
								{order}
								author={order._author}
								requestedItem={order._requested_item}
								requestedCurrency={order._requested_currency}
								onContact={() => handleContact(order)}
							/>
						{/each}
					</div>
				{/if}

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
					{:else if !hasMore && allListings.length > 0}
						<p class="text-[var(--color-textSecondary)]">All listings loaded</p>
					{/if}
				</div>
			</main>
		</div>
	</div>
</div>
