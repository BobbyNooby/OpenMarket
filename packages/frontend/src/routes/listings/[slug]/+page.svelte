<script lang="ts">
	import { ListingCard, Button } from '$lib/shared/components';

	let { data } = $props();

	// Filter state
	let orderTypeFilter = $state<'all' | 'buy' | 'sell'>('all');

	// Transform API data to match component expectations
	const listings = $derived(
		(data.listings || []).map((listing: any) => ({
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
		}))
	);

	// Apply filters
	const filteredListings = $derived(() => {
		if (orderTypeFilter === 'all') return listings;
		return listings.filter((l: any) => l.order_type === orderTypeFilter);
	});

	// Separate buy and sell counts
	const buyCount = $derived(listings.filter((l: any) => l.order_type === 'buy').length);
	const sellCount = $derived(listings.filter((l: any) => l.order_type === 'sell').length);

	// Handle contact click
	function handleContact(order: any) {
		alert(`Contact ${order._author.display_name} (@${order._author.username}) about this order!`);
	}
</script>

<div class="min-h-screen text-[var(--color-text)]">
	<!-- Header with Item Info -->
	<div class="bg-[var(--color-surface)] py-8 shadow-[var(--shadow-sm)]">
		<div class="mx-auto max-w-7xl px-8">
			<div class="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
				<a href="/" class="hover:text-[var(--color-primary)]">Home</a>
				<span>/</span>
				<a href="/listings" class="hover:text-[var(--color-primary)]">Listings</a>
				<span>/</span>
				<span class="text-[var(--color-text)]">{data.item.name}</span>
			</div>

			<div class="mt-6 flex items-start gap-6">
				{#if data.item.image_url}
					<img
						src={data.item.image_url}
						alt={data.item.name}
						class="h-24 w-24 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background)] object-cover"
					/>
				{:else}
					<div
						class="flex h-24 w-24 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-background)]"
					>
						<span class="text-3xl">
							{data.itemType === 'currency' ? '💰' : '📦'}
						</span>
					</div>
				{/if}

				<div class="flex-1">
					<div class="flex items-center gap-3">
						<h1 class="text-3xl font-bold text-[var(--color-text)]">{data.item.name}</h1>
						<span
							class="rounded-full px-3 py-1 text-xs font-semibold uppercase"
							class:bg-[var(--color-primary)]={data.itemType === 'item'}
							class:bg-[var(--color-warning)]={data.itemType === 'currency'}
							class:text-white={true}
						>
							{data.itemType}
						</span>
					</div>

					<p class="mt-1 text-sm text-[var(--color-textTertiary)]">
						{#if data.itemType === 'item'}
							Listings where people want to buy or sell this item
						{:else}
							Listings where people want to buy or sell this currency
						{/if}
					</p>

					{#if data.item.description}
						<p class="mt-2 text-[var(--color-textSecondary)]">{data.item.description}</p>
					{/if}

					<div class="mt-4 flex items-center gap-4">
						<span class="text-sm">
							<span class="font-semibold text-[var(--color-success)]">{buyCount}</span>
							<span class="text-[var(--color-textSecondary)]">buy orders</span>
						</span>
						<span class="text-sm">
							<span class="font-semibold text-[var(--color-warning)]">{sellCount}</span>
							<span class="text-[var(--color-textSecondary)]">sell orders</span>
						</span>

						{#if data.item.wiki_link}
							<a
								href={data.item.wiki_link}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm text-[var(--color-primary)] hover:underline"
							>
								Wiki Page
							</a>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Listings Section -->
	<div class="mx-auto max-w-7xl px-8 py-8">
		<!-- Filter Tabs -->
		<div class="mb-6 flex items-center justify-between">
			<div class="flex gap-2">
				<button
					class="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors"
					class:bg-[var(--color-primary)]={orderTypeFilter === 'all'}
					class:text-white={orderTypeFilter === 'all'}
					class:bg-[var(--color-surface)]={orderTypeFilter !== 'all'}
					class:text-[var(--color-text)]={orderTypeFilter !== 'all'}
					onclick={() => (orderTypeFilter = 'all')}
				>
					All ({listings.length})
				</button>
				<button
					class="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors"
					class:bg-[var(--color-success)]={orderTypeFilter === 'buy'}
					class:text-white={orderTypeFilter === 'buy'}
					class:bg-[var(--color-surface)]={orderTypeFilter !== 'buy'}
					class:text-[var(--color-text)]={orderTypeFilter !== 'buy'}
					onclick={() => (orderTypeFilter = 'buy')}
				>
					Buy Orders ({buyCount})
				</button>
				<button
					class="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors"
					class:bg-[var(--color-warning)]={orderTypeFilter === 'sell'}
					class:text-white={orderTypeFilter === 'sell'}
					class:bg-[var(--color-surface)]={orderTypeFilter !== 'sell'}
					class:text-[var(--color-text)]={orderTypeFilter !== 'sell'}
					onclick={() => (orderTypeFilter = 'sell')}
				>
					Sell Orders ({sellCount})
				</button>
			</div>

			<a href="/listings">
				<Button variant="secondary" size="sm">Back to All Listings</Button>
			</a>
		</div>

		<!-- Listings Grid -->
		{#if filteredListings().length === 0}
			<div
				class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center"
			>
				<p class="text-lg text-[var(--color-textSecondary)]">
					No {orderTypeFilter === 'all' ? '' : orderTypeFilter} listings found for this item.
				</p>
				<p class="mt-2 text-sm text-[var(--color-textTertiary)]">
					Check back later or browse other items.
				</p>
				<div class="mt-4">
					<a href="/listings">
						<Button variant="primary">Browse All Listings</Button>
					</a>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
				{#each filteredListings() as order}
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
	</div>
</div>
