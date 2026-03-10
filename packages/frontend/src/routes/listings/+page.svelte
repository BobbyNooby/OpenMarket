<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { onMount } from 'svelte';
	import type { Item } from '$lib/api/types';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';

	let { data } = $props();

	const items = $derived((data.items || []) as unknown as Item[]);

	let allListings = $state<any[]>(data.listings || []);
	let loading = $state(false);
	let hasMore = $state(data.pagination?.hasMore ?? false);
	let offset = $state(data.listings?.length || 0);
	const limit = 20;

	let searchQuery = $state('');
	let orderTypeFilter = $state<'all' | 'buy' | 'sell'>('all');
	let statusFilter = $state<'active' | 'sold' | 'paused' | 'expired' | 'all'>('active');
	let selectedItemId = $state<string | null>(null);

	const listings = $derived(
		allListings.map(transformListing).filter((l): l is TransformedListing => l !== null)
	);

	const filteredListings = $derived(() => {
		let result = listings;

		if (orderTypeFilter !== 'all') {
			result = result.filter((l) => l.order_type === orderTypeFilter);
		}

		if (selectedItemId) {
			result = result.filter((l) => l.requested_item_id === selectedItemId);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(l) =>
					l.requested_item?.name?.toLowerCase().includes(query) ||
					l.requested_currency?.name?.toLowerCase().includes(query) ||
					l.author.display_name.toLowerCase().includes(query) ||
					l.author.username.toLowerCase().includes(query)
			);
		}

		return result;
	});

	async function loadMore() {
		if (loading || !hasMore) return;

		loading = true;
		try {
			const res = await fetch(`/api/listings?limit=${limit}&offset=${offset}&status=${statusFilter}`);
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

	function handleContact(order: TransformedListing) {
		alert(`Contact ${order.author.display_name} (@${order.author.username}) about this order!`);
	}

	function clearFilters() {
		searchQuery = '';
		orderTypeFilter = 'all';
		statusFilter = 'active';
		selectedItemId = null;
		allListings = [];
		offset = 0;
		hasMore = true;
		loadMore();
	}
</script>

<div class="min-h-screen text-foreground">
	<!-- Header -->
	<div class="bg-card py-8 shadow-sm">
		<div class="mx-auto max-w-7xl px-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-4xl font-bold text-primary">All Listings</h1>
					<p class="mt-2 text-muted-foreground">
						Browse and filter all marketplace listings
					</p>
				</div>
				<a href="/listings/new">
					<Button>+ Create Listing</Button>
				</a>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-8 py-8">
		<div class="flex gap-8">
			<!-- Sidebar Filters -->
			<aside class="w-72 flex-shrink-0">
				<div class="sticky top-20 rounded-lg border border-border bg-card p-6">
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-lg font-semibold">Filters</h2>
						<button
							class="text-sm text-primary hover:underline"
							onclick={clearFilters}
						>
							Clear all
						</button>
					</div>

					<!-- Search -->
					<div class="mb-6 space-y-2">
						<Label for="search">Search</Label>
						<Input
							id="search"
							type="search"
							placeholder="Search listings..."
							bind:value={searchQuery}
						/>
					</div>

					<!-- Order Type Filter -->
					<div class="mb-6">
						<span class="mb-2 block text-sm font-semibold">Order Type</span>
						<div class="flex gap-2" role="group" aria-label="Order type filter">
							<button
								class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {orderTypeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}"
								onclick={() => (orderTypeFilter = 'all')}
							>
								All
							</button>
							<button
								class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {orderTypeFilter === 'buy' ? 'bg-green-500 text-white' : 'bg-background text-foreground'}"
								onclick={() => (orderTypeFilter = 'buy')}
							>
								Buy
							</button>
							<button
								class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {orderTypeFilter === 'sell' ? 'bg-amber-500 text-white' : 'bg-background text-foreground'}"
								onclick={() => (orderTypeFilter = 'sell')}
							>
								Sell
							</button>
						</div>
					</div>

					<!-- Status Filter -->
					<div class="mb-6">
						<span class="mb-2 block text-sm font-semibold">Status</span>
						<div class="flex flex-wrap gap-2" role="group" aria-label="Status filter">
							{#each ['active', 'paused', 'sold', 'expired', 'all'] as s}
								<button
									class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {statusFilter === s
										? s === 'active' ? 'bg-green-500 text-white'
										: s === 'sold' ? 'bg-red-500 text-white'
										: s === 'paused' ? 'bg-yellow-500 text-white'
										: s === 'expired' ? 'bg-gray-500 text-white'
										: 'bg-primary text-primary-foreground'
										: 'bg-background text-foreground'}"
									onclick={() => {
										statusFilter = s as any;
										allListings = [];
										offset = 0;
										hasMore = true;
										loadMore();
									}}
								>
									{s.charAt(0).toUpperCase() + s.slice(1)}
								</button>
							{/each}
						</div>
					</div>

					<!-- Item Filter -->
					<div class="mb-6 space-y-2">
						<Label for="item-filter">Filter by Item</Label>
						<select
							id="item-filter"
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
									class="rounded-full bg-background px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
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
					<p class="text-muted-foreground">
						Showing {filteredListings().length} listing{filteredListings().length !== 1 ? 's' : ''}
						{#if data.pagination?.total}
							<span class="text-muted-foreground/70">
								(loaded {allListings.length} of {data.pagination.total})
							</span>
						{/if}
					</p>
				</div>

				{#if filteredListings().length === 0}
					<div class="rounded-lg border border-border bg-card py-16 text-center">
						<p class="text-lg text-muted-foreground">No listings found.</p>
						<p class="mt-2 text-sm text-muted-foreground/70">
							Try adjusting your filters or search query.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
						{#each filteredListings() as order (order.id)}
							<ListingCard {order} onContact={() => handleContact(order)} sessionUserId={data.session?.user?.id} />
						{/each}
					</div>
				{/if}

				<div bind:this={sentinelRef} class="mt-8 flex justify-center">
					{#if loading}
						<div class="flex items-center gap-2 text-muted-foreground">
							<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
							<span>Loading more...</span>
						</div>
					{:else if !hasMore && allListings.length > 0}
						<p class="text-muted-foreground">All listings loaded</p>
					{/if}
				</div>
			</main>
		</div>
	</div>
</div>
