<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Item, Currency } from '$lib/api/types';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';
	import { debounce } from '$lib/utils/debounce';
	import { PUBLIC_API_URL } from '$env/static/public';
	import Search from '@lucide/svelte/icons/search';
	import Package from '@lucide/svelte/icons/package';
	import Coins from '@lucide/svelte/icons/coins';
	import X from '@lucide/svelte/icons/x';

	interface Category {
		id: string;
		name: string;
		slug: string;
		icon_url: string | null;
	}

	let { data } = $props();

	const items = $derived((data.items || []) as unknown as Item[]);
	const currencies = $derived((data.currencies || []) as unknown as Currency[]);
	const categories = $derived((data.categories || []) as unknown as Category[]);

	let allListings = $state<any[]>(data.listings || []);
	let loading = $state(false);
	let hasMore = $state(data.pagination?.hasMore ?? false);
	let offset = $state(data.listings?.length || 0);
	let totalCount = $state(data.pagination?.total ?? 0);
	const limit = 20;

	// Filter state — initialized from URL via server load
	let searchQuery = $state(data.filters?.q || '');
	let orderTypeFilter = $state<'all' | 'buy' | 'sell'>((data.filters?.orderType as 'all' | 'buy' | 'sell') || 'all');
	let statusFilter = $state(data.filters?.status || 'active');
	let selectedItemId = $state<string | null>(data.filters?.itemId || null);
	let selectedCurrencyId = $state<string | null>(data.filters?.currencyId || null);
	let selectedCategoryId = $state<string | null>(data.filters?.categoryId || null);
	let sortBy = $state(data.filters?.sortBy || 'newest');
	let minAmount = $state(data.filters?.minAmount || '');
	let maxAmount = $state(data.filters?.maxAmount || '');

	// Search suggestions
	let showSuggestions = $state(false);
	let searchInputRef = $state<HTMLInputElement | null>(null);

	const suggestions = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return { items: [], currencies: [] };

		const matchedItems = items
			.filter((i) => i.name.toLowerCase().includes(q))
			.slice(0, 5);
		const matchedCurrencies = currencies
			.filter((c) => c.name.toLowerCase().includes(q))
			.slice(0, 5);

		return { items: matchedItems, currencies: matchedCurrencies };
	});

	const hasSuggestions = $derived(
		suggestions().items.length > 0 || suggestions().currencies.length > 0
	);

	const listings = $derived(
		allListings.map(transformListing).filter((l): l is TransformedListing => l !== null)
	);

	// Active filter label for the chip
	const activeFilterLabel = $derived(() => {
		if (selectedItemId) return items.find((i) => i.id === selectedItemId)?.name;
		if (selectedCurrencyId) return currencies.find((c) => c.id === selectedCurrencyId)?.name;
		if (selectedCategoryId) return categories.find((c) => c.id === selectedCategoryId)?.name;
		return null;
	});

	// Build query string from current filter state
	function buildQueryString(): string {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (orderTypeFilter !== 'all') params.set('orderType', orderTypeFilter);
		if (statusFilter !== 'active') params.set('status', statusFilter);
		if (selectedItemId) params.set('itemId', selectedItemId);
		if (selectedCurrencyId) params.set('currencyId', selectedCurrencyId);
		if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
		if (sortBy !== 'newest') params.set('sortBy', sortBy);
		if (minAmount) params.set('minAmount', minAmount);
		if (maxAmount) params.set('maxAmount', maxAmount);
		return params.toString();
	}

	// Build fetch URL with all filter params
	function buildFetchUrl(fetchOffset: number): string {
		const params = new URLSearchParams();
		params.set('limit', String(limit));
		params.set('offset', String(fetchOffset));
		params.set('status', statusFilter);
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (orderTypeFilter !== 'all') params.set('orderType', orderTypeFilter);
		if (selectedItemId) params.set('itemId', selectedItemId);
		if (selectedCurrencyId) params.set('currencyId', selectedCurrencyId);
		if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
		if (sortBy !== 'newest') params.set('sortBy', sortBy);
		if (minAmount) params.set('minAmount', minAmount);
		if (maxAmount) params.set('maxAmount', maxAmount);
		return `/api/listings?${params}`;
	}

	// Apply filters: update URL and re-fetch from scratch
	async function applyFilters() {
		const qs = buildQueryString();
		goto(`/listings${qs ? '?' + qs : ''}`, { replaceState: true, noScroll: true });

		allListings = [];
		offset = 0;
		hasMore = true;
		loading = true;

		try {
			const res = await fetch(buildFetchUrl(0));
			const result = await res.json();

			if (result.success && result.data) {
				allListings = result.data;
				offset = result.data.length;
				hasMore = result.pagination?.hasMore ?? false;
				totalCount = result.pagination?.total ?? 0;
			}
		} catch (err) {
			console.error('Failed to fetch listings:', err);
		} finally {
			loading = false;
		}
	}

	// Debounced search: waits 300ms after last keystroke
	const debouncedSearch = debounce(() => {
		if (!selectedItemId && !selectedCurrencyId) {
			applyFilters();
		}
	}, 300);

	function selectItem(item: Item) {
		selectedItemId = item.id;
		selectedCurrencyId = null;
		searchQuery = item.name;
		showSuggestions = false;
		applyFilters();
	}

	function selectCurrency(currency: Currency) {
		selectedCurrencyId = currency.id;
		selectedItemId = null;
		searchQuery = currency.name;
		showSuggestions = false;
		applyFilters();
	}

	async function loadMore() {
		if (loading || !hasMore) return;

		loading = true;
		try {
			const res = await fetch(buildFetchUrl(offset));
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

		function handleClickOutside(e: MouseEvent) {
			if (searchInputRef && !searchInputRef.closest('.relative')?.contains(e.target as Node)) {
				showSuggestions = false;
			}
		}
		document.addEventListener('click', handleClickOutside);

		return () => {
			observer.disconnect();
			document.removeEventListener('click', handleClickOutside);
			debouncedSearch.cancel();
		};
	});

	function handleContact(order: TransformedListing) {
		alert(`Contact ${order.author.display_name} (@${order.author.username}) about this order!`);
	}

	function clearFilters() {
		searchQuery = '';
		orderTypeFilter = 'all';
		statusFilter = 'active';
		selectedItemId = null;
		selectedCurrencyId = null;
		selectedCategoryId = null;
		sortBy = 'newest';
		minAmount = '';
		maxAmount = '';
		showSuggestions = false;
		applyFilters();
	}

	function clearEntityFilter() {
		selectedItemId = null;
		selectedCurrencyId = null;
		selectedCategoryId = null;
		searchQuery = '';
		applyFilters();
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
			<aside class="w-72 shrink-0">
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

					<!-- Search with Suggestions -->
					<div class="relative mb-6 space-y-2">
						<Label for="search">Search</Label>
						<div class="relative">
							<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								id="search"
								type="search"
								placeholder="Search items, currencies..."
								class="pl-8"
								bind:value={searchQuery}
								bind:ref={searchInputRef}
								onfocus={() => (showSuggestions = true)}
								oninput={() => {
									showSuggestions = true;
									if (!searchQuery.trim()) {
										selectedItemId = null;
										selectedCurrencyId = null;
									}
									debouncedSearch();
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Escape') showSuggestions = false;
								}}
							/>
						</div>

						{#if showSuggestions && searchQuery.trim() && hasSuggestions}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
								onmousedown={(e: MouseEvent) => e.preventDefault()}
							>
								{#if suggestions().items.length > 0}
									<div class="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Items</div>
									{#each suggestions().items as item}
										<button
											class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent {selectedItemId === item.id ? 'bg-accent' : ''}"
											onclick={() => selectItem(item)}
										>
											{#if item.image_url}
												<img src={item.image_url} alt="" class="h-5 w-5 rounded object-cover" />
											{:else}
												<Package class="h-5 w-5 text-muted-foreground" />
											{/if}
											<span>{item.name}</span>
										</button>
									{/each}
								{/if}

								{#if suggestions().currencies.length > 0}
									{#if suggestions().items.length > 0}
										<div class="border-t border-border"></div>
									{/if}
									<div class="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Currencies</div>
									{#each suggestions().currencies as currency}
										<button
											class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent {selectedCurrencyId === currency.id ? 'bg-accent' : ''}"
											onclick={() => selectCurrency(currency)}
										>
											{#if currency.image_url}
												<img src={currency.image_url} alt="" class="h-5 w-5 rounded object-cover" />
											{:else}
												<Coins class="h-5 w-5 text-muted-foreground" />
											{/if}
											<span>{currency.name}</span>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>

					<!-- Order Type Filter -->
					<div class="mb-6">
						<span class="mb-2 block text-sm font-semibold">Order Type</span>
						<div class="flex gap-2" role="group" aria-label="Order type filter">
							{#each [{ value: 'all', label: 'All', color: 'bg-primary text-primary-foreground' }, { value: 'buy', label: 'Buy', color: 'bg-green-500 text-white' }, { value: 'sell', label: 'Sell', color: 'bg-amber-500 text-white' }] as opt}
								<button
									class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {orderTypeFilter === opt.value ? opt.color : 'bg-background text-foreground'}"
									onclick={() => {
										orderTypeFilter = opt.value as any;
										applyFilters();
									}}
								>
									{opt.label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Status Filter -->
					<div class="mb-6">
						<span class="mb-2 block text-sm font-semibold">Status</span>
						<div class="flex flex-wrap gap-2" role="group" aria-label="Status filter">
							{#each ['active', 'paused', 'expired', 'all'] as s}
								<button
									class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {statusFilter === s
										? s === 'active' ? 'bg-green-500 text-white'
										: s === 'paused' ? 'bg-yellow-500 text-white'
										: s === 'expired' ? 'bg-gray-500 text-white'
										: 'bg-primary text-primary-foreground'
										: 'bg-background text-foreground'}"
									onclick={() => {
										statusFilter = s as any;
										applyFilters();
									}}
								>
									{s.charAt(0).toUpperCase() + s.slice(1)}
								</button>
							{/each}
						</div>
					</div>

					<!-- Sort -->
					<div class="mb-6 space-y-2">
						<Label for="sort">Sort By</Label>
						<select
							id="sort"
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							bind:value={sortBy}
							onchange={() => applyFilters()}
						>
							<option value="newest">Newest First</option>
							<option value="oldest">Oldest First</option>
							<option value="amount_asc">Amount: Low to High</option>
							<option value="amount_desc">Amount: High to Low</option>
						</select>
					</div>

					<!-- Category Filter -->
					{#if categories.length > 0}
						<div class="mb-6 space-y-2">
							<Label for="category-filter">Category</Label>
							<select
								id="category-filter"
								class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								bind:value={selectedCategoryId}
								onchange={() => applyFilters()}
							>
								<option value={null}>All Categories</option>
								{#each categories as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Item Filter -->
					<div class="mb-6 space-y-2">
						<Label for="item-filter">Filter by Item</Label>
						<select
							id="item-filter"
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							bind:value={selectedItemId}
							onchange={() => {
								if (selectedItemId) {
									selectedCurrencyId = null;
									searchQuery = items.find((i) => i.id === selectedItemId)?.name || '';
								}
								applyFilters();
							}}
						>
							<option value={null}>All Items</option>
							{#each items as item}
								<option value={item.id}>{item.name}</option>
							{/each}
						</select>
					</div>

					<!-- Amount Range -->
					<div class="mb-6 space-y-2">
						<Label>Amount Range</Label>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								placeholder="Min"
								bind:value={minAmount}
								class="w-full"
								onchange={() => applyFilters()}
							/>
							<span class="text-muted-foreground">—</span>
							<Input
								type="number"
								placeholder="Max"
								bind:value={maxAmount}
								class="w-full"
								onchange={() => applyFilters()}
							/>
						</div>
					</div>

					<!-- Quick Item Links -->
					<div>
						<span class="mb-2 block text-sm font-semibold">Popular Items</span>
						<div class="flex flex-wrap gap-2">
							{#each items.slice(0, 6) as item}
								<button
									class="rounded-full bg-background px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
									onclick={() => selectItem(item)}
								>
									{item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</aside>

			<!-- Listings Grid -->
			<main class="flex-1">
				{#if activeFilterLabel()}
					<div class="mb-3 flex items-center gap-2">
						<span class="text-sm text-muted-foreground">Filtered by:</span>
						<button
							class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/20"
							onclick={clearEntityFilter}
						>
							{activeFilterLabel()}
							<X class="h-3 w-3" />
						</button>
					</div>
				{/if}

				{#if searchQuery.trim() && !selectedItemId && !selectedCurrencyId}
					<div class="mb-3">
						<span class="text-sm text-muted-foreground">
							{totalCount} result{totalCount !== 1 ? 's' : ''} for "{searchQuery.trim()}"
						</span>
					</div>
				{/if}

				<div class="mb-4 flex items-center justify-between">
					<p class="text-muted-foreground">
						Showing {listings.length} listing{listings.length !== 1 ? 's' : ''}
						{#if totalCount > 0}
							<span class="text-muted-foreground/70">
								(loaded {allListings.length} of {totalCount})
							</span>
						{/if}
					</p>
				</div>

				{#if listings.length === 0 && !loading}
					<div class="rounded-lg border border-border bg-card py-16 text-center">
						<p class="text-lg text-muted-foreground">No listings found.</p>
						<p class="mt-2 text-sm text-muted-foreground/70">
							Try adjusting your filters or search query.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
						{#each listings as order (order.id)}
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
