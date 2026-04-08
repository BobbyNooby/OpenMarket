<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import ItemImage from '$lib/components/item/ItemImage.svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import PackageX from '@lucide/svelte/icons/package-x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	interface Props {
		listingId: string;
	}

	let { listingId }: Props = $props();

	type Slim = { name: string; image_url?: string };
	type OfferedItem = { item: Slim; amount: number };
	type OfferedCurrency = { currency: Slim; amount: number };

	type Listing = {
		id: string;
		amount: number;
		order_type: 'buy' | 'sell';
		status: 'active' | 'sold' | 'paused' | 'expired';
		requested_item?: Slim;
		requested_currency?: Slim;
		offered_items?: OfferedItem[];
		offered_currencies?: OfferedCurrency[];
	};

	let listing = $state<Listing | null>(null);
	let loading = $state(true);
	let notFound = $state(false);

	onMount(async () => {
		try {
			const res = await fetch(`${PUBLIC_API_URL}/listings/${listingId}`, {
				credentials: 'include',
			});
			const json = await res.json();
			if (json.success && json.data) {
				listing = json.data;
			} else {
				notFound = true;
			}
		} catch {
			notFound = true;
		} finally {
			loading = false;
		}
	});

	const requested = $derived.by(() => {
		if (!listing) return null;
		const slim = listing.requested_item ?? listing.requested_currency;
		if (!slim) return null;
		return { name: slim.name, image_url: slim.image_url ?? '', amount: listing.amount };
	});

	const offered = $derived.by(() => {
		if (!listing) return [];
		const items = (listing.offered_items ?? []).map((o) => ({
			name: o.item.name,
			image_url: o.item.image_url ?? '',
			amount: o.amount,
		}));
		const currencies = (listing.offered_currencies ?? []).map((o) => ({
			name: o.currency.name,
			image_url: o.currency.image_url ?? '',
			amount: o.amount,
		}));
		return [...items, ...currencies];
	});
</script>

<div class="my-1 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm max-w-md">
	{#if loading}
		<div class="flex w-full items-center justify-center py-2">
			<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
		</div>
	{:else if notFound || !listing}
		<PackageX class="h-8 w-8 shrink-0 text-muted-foreground" />
		<div class="flex-1">
			<p class="text-sm font-medium text-muted-foreground">Listing no longer available</p>
		</div>
	{:else}
		<div class="min-w-0 flex-1">
			<div class="mb-2 flex items-center gap-1.5">
				{#if listing.order_type === 'buy'}
					<Badge class="bg-green-500 text-white hover:bg-green-500">Buy</Badge>
				{:else}
					<Badge class="bg-amber-500 text-white hover:bg-amber-500">Sell</Badge>
				{/if}
				{#if listing.status !== 'active'}
					<Badge variant="secondary" class="capitalize">{listing.status}</Badge>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<!-- Requested -->
				{#if requested}
					<div class="flex flex-col items-center gap-1">
						<ItemImage src={requested.image_url} alt={requested.name} size="sm" />
						<p class="max-w-15 truncate text-center text-[10px] text-muted-foreground">
							{requested.amount}× {requested.name}
						</p>
					</div>
				{/if}

				<ArrowRight class="h-4 w-4 shrink-0 text-muted-foreground" />

				<!-- Offered -->
				{#if offered.length === 0}
					<span class="text-xs text-muted-foreground">Nothing offered</span>
				{:else}
					<div class="flex flex-wrap items-start gap-2">
						{#each offered as o}
							<div class="flex flex-col items-center gap-1">
								<ItemImage src={o.image_url} alt={o.name} size="sm" />
								<p class="max-w-15 truncate text-center text-[10px] text-muted-foreground">
									{o.amount}× {o.name}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
		<Button variant="outline" size="sm" href="/listings/view/{listing.id}">View</Button>
	{/if}
</div>
