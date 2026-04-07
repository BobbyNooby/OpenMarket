<script lang="ts">
	import { ListingCard } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import Users from '@lucide/svelte/icons/users';
	import Search from '@lucide/svelte/icons/search';
	import { transformListing, type TransformedListing } from '$lib/utils/listings';

	let { data } = $props();

	let orderTypeFilter = $state<'all' | 'buy' | 'sell'>('all');

	function activeDot(last_active_at: string | null): boolean {
		if (!last_active_at) return false;
		const diff = Date.now() - new Date(last_active_at).getTime();
		return diff < 7 * 24 * 60 * 60 * 1000;
	}

	const listings = $derived(
		(data.listings || [])
			.map(transformListing)
			.filter((l: ReturnType<typeof transformListing>): l is TransformedListing => l !== null)
	);

	const filteredListings = $derived(
		orderTypeFilter === 'all' ? listings : listings.filter((l: TransformedListing) => l.order_type === orderTypeFilter)
	);

	const buyCount = $derived(listings.filter((l: TransformedListing) => l.order_type === 'buy').length);
	const sellCount = $derived(listings.filter((l: TransformedListing) => l.order_type === 'sell').length);

</script>

<div class="min-h-screen text-foreground">
	<!-- Header with Item Info -->
	<div class="bg-card py-8 shadow-sm">
		<div class="mx-auto max-w-7xl px-8">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<a href="/" class="hover:text-primary">Home</a>
				<span>/</span>
				<a href="/listings" class="hover:text-primary">Listings</a>
				<span>/</span>
				<span class="text-foreground">{data.item.name}</span>
			</div>

			<div class="mt-6 flex items-start gap-6">
				{#if data.item.image_url}
					<img
						src={data.item.image_url}
						alt={data.item.name}
						class="h-24 w-24 rounded-lg border border-border bg-background object-cover"
					/>
				{:else}
					<div
						class="flex h-24 w-24 items-center justify-center rounded-lg border border-border bg-background"
					>
						<span class="text-3xl">
							{data.itemType === 'currency' ? '💰' : '📦'}
						</span>
					</div>
				{/if}

				<div class="flex-1">
					<div class="flex items-center gap-3">
						<h1 class="text-3xl font-bold text-foreground">{data.item.name}</h1>
						{#if data.itemType === 'item'}
							<Badge>Item</Badge>
						{:else}
							<Badge class="bg-amber-500 text-white hover:bg-amber-500">Currency</Badge>
						{/if}
					</div>

					<p class="mt-1 text-sm text-muted-foreground">
						{#if data.itemType === 'item'}
							Listings where people want to buy or sell this item
						{:else}
							Listings where people want to buy or sell this currency
						{/if}
					</p>

					{#if data.item.description}
						<p class="mt-2 text-muted-foreground">{data.item.description}</p>
					{/if}

					<div class="mt-4 flex items-center gap-4">
						<span class="text-sm">
							<span class="font-semibold text-green-500">{buyCount}</span>
							<span class="text-muted-foreground">buy orders</span>
						</span>
						<span class="text-sm">
							<span class="font-semibold text-amber-500">{sellCount}</span>
							<span class="text-muted-foreground">sell orders</span>
						</span>

						{#if data.item.wiki_link}
							<a
								href={data.item.wiki_link}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm text-primary hover:underline"
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
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {orderTypeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}"
					onclick={() => (orderTypeFilter = 'all')}
				>
					All ({listings.length})
				</button>
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {orderTypeFilter === 'buy' ? 'bg-green-500 text-white' : 'bg-card text-foreground'}"
					onclick={() => (orderTypeFilter = 'buy')}
				>
					Buy Orders ({buyCount})
				</button>
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {orderTypeFilter === 'sell' ? 'bg-amber-500 text-white' : 'bg-card text-foreground'}"
					onclick={() => (orderTypeFilter = 'sell')}
				>
					Sell Orders ({sellCount})
				</button>
			</div>

			<a href="/listings">
				<Button variant="outline" size="sm">Back to All Listings</Button>
			</a>
		</div>

		{#if filteredListings.length === 0}
			<div class="rounded-lg border border-border bg-card py-16 text-center">
				<p class="text-lg text-muted-foreground">
					No {orderTypeFilter === 'all' ? '' : orderTypeFilter} listings found for this item.
				</p>
				<p class="mt-2 text-sm text-muted-foreground/70">
					Check back later or browse other items.
				</p>
				<div class="mt-4">
					<a href="/listings">
						<Button>Browse All Listings</Button>
					</a>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
				{#each filteredListings as order (order.id)}
					<ListingCard {order} sessionUserId={data.session?.user?.id} />
				{/each}
			</div>
		{/if}

		<!-- Reverse search: players who have / want this -->
		{#if data.haveTotal > 0 || data.wantTotal > 0}
			<div class="mt-12 space-y-6">
				{#if data.haveTotal > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Users class="h-5 w-5" />
								Players who have {data.item.name} ({data.haveTotal})
							</Card.Title>
							<Card.Description>
								Traders who have added this to their "Have" list.
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
								{#each data.haveUsers as u (u.user_id)}
									<a
										href="/profile/{u.username}"
										class="flex flex-col items-center gap-2 rounded-md p-3 transition-colors hover:bg-card"
									>
										<div class="relative">
											{#if u.avatar_url}
												<img
													src={u.avatar_url}
													alt={u.display_name}
													class="h-14 w-14 rounded-full border border-border object-cover"
												/>
											{:else}
												<div class="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary font-semibold text-primary-foreground">
													{u.display_name.charAt(0).toUpperCase()}
												</div>
											{/if}
											{#if activeDot(u.last_active_at)}
												<span class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" title="Active recently"></span>
											{/if}
										</div>
										<p class="truncate text-center text-xs font-medium text-foreground">@{u.username}</p>
									</a>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				{#if data.wantTotal > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Search class="h-5 w-5" />
								Players looking for {data.item.name} ({data.wantTotal})
							</Card.Title>
							<Card.Description>
								Traders actively searching for this.
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
								{#each data.wantUsers as u (u.user_id)}
									<a
										href="/profile/{u.username}"
										class="flex flex-col items-center gap-2 rounded-md p-3 transition-colors hover:bg-card"
									>
										<div class="relative">
											{#if u.avatar_url}
												<img
													src={u.avatar_url}
													alt={u.display_name}
													class="h-14 w-14 rounded-full border border-border object-cover"
												/>
											{:else}
												<div class="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary font-semibold text-primary-foreground">
													{u.display_name.charAt(0).toUpperCase()}
												</div>
											{/if}
											{#if activeDot(u.last_active_at)}
												<span class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" title="Active recently"></span>
											{/if}
										</div>
										<p class="truncate text-center text-xs font-medium text-foreground">@{u.username}</p>
									</a>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		{/if}
	</div>
</div>
