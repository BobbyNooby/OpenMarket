<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { Input } from '$lib/components/ui/input';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Item, Currency } from '$lib/api/types';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Coins from '@lucide/svelte/icons/coins';
	import Search from '@lucide/svelte/icons/search';
	import Package from '@lucide/svelte/icons/package';

	let { data } = $props();
	let searchQuery = $state('');
	let showSuggestions = $state(false);
	let searchInputRef = $state<HTMLInputElement | null>(null);

	const items = $derived((data.items || []) as unknown as Item[]);
	const currencies = $derived((data.currencies || []) as unknown as Currency[]);

	const suggestions = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return { items: [], currencies: [] };
		return {
			items: items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 5),
			currencies: currencies.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5)
		};
	});

	const hasSuggestions = $derived(
		suggestions().items.length > 0 || suggestions().currencies.length > 0
	);

	function selectItem(item: Item) {
		showSuggestions = false;
		goto(`/listings?itemId=${item.id}&q=${encodeURIComponent(item.name)}`);
	}

	function selectCurrency(currency: Currency) {
		showSuggestions = false;
		goto(`/listings?currencyId=${currency.id}&q=${encodeURIComponent(currency.name)}`);
	}

	function handleSearchSubmit() {
		if (searchQuery.trim()) {
			showSuggestions = false;
			goto(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	}

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

		function handleClickOutside(e: MouseEvent) {
			if (searchInputRef && !searchInputRef.closest('.relative')?.contains(e.target as Node)) {
				showSuggestions = false;
			}
		}
		document.addEventListener('click', handleClickOutside);

		return () => {
			observer.disconnect();
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function handleContact(order: TransformedListing) {
		alert(`Contact ${order.author.display_name} (@${order.author.username}) about this order!`);
	}
</script>

<div class="min-h-screen text-foreground">
	<div class="relative z-10 bg-card py-32 shadow-sm overflow-visible">
		<div class="mx-auto max-w-7xl px-8">
			<div class="text-center">
				<h1 class="mb-6 text-7xl font-bold text-primary">OpenMarket</h1>
				<p class="mb-8 text-xl text-muted-foreground">
					The marketplace for trading game items and currencies
				</p>
				<div class="relative mx-auto max-w-2xl">
					<div class="relative">
						<Search class="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search for items or currencies..."
							bind:value={searchQuery}
							bind:ref={searchInputRef}
							class="h-12 pl-11 text-center text-lg"
							onfocus={() => (showSuggestions = true)}
							oninput={() => (showSuggestions = true)}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Escape') showSuggestions = false;
								if (e.key === 'Enter') handleSearchSubmit();
							}}
						/>
					</div>

					{#if showSuggestions && searchQuery.trim() && hasSuggestions}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
							onmousedown={(e: MouseEvent) => e.preventDefault()}
						>
							{#if suggestions().items.length > 0}
								<div class="px-4 py-2 text-xs font-semibold text-muted-foreground">Items</div>
								{#each suggestions().items as item}
									<button
										class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent"
										onclick={() => selectItem(item)}
									>
										{#if item.image_url}
											<img src={item.image_url} alt="" class="h-6 w-6 rounded object-cover" />
										{:else}
											<Package class="h-6 w-6 text-muted-foreground" />
										{/if}
										<span>{item.name}</span>
									</button>
								{/each}
							{/if}

							{#if suggestions().currencies.length > 0}
								{#if suggestions().items.length > 0}
									<div class="border-t border-border"></div>
								{/if}
								<div class="px-4 py-2 text-xs font-semibold text-muted-foreground">Currencies</div>
								{#each suggestions().currencies as currency}
									<button
										class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent"
										onclick={() => selectCurrency(currency)}
									>
										{#if currency.image_url}
											<img src={currency.image_url} alt="" class="h-6 w-6 rounded object-cover" />
										{:else}
											<Coins class="h-6 w-6 text-muted-foreground" />
										{/if}
										<span>{currency.name}</span>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
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
