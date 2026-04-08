<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import ItemImage from '$lib/components/item/ItemImage.svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import PackageX from '@lucide/svelte/icons/package-x';

	interface Props {
		listingId: string;
	}

	let { listingId }: Props = $props();

	type Listing = {
		id: string;
		amount: number;
		order_type: 'buy' | 'sell';
		status: 'active' | 'sold' | 'paused' | 'expired';
		requested_item?: { name: string; image_url?: string };
		requested_currency?: { name: string; image_url?: string };
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

	const requestedName = $derived(
		listing?.requested_item?.name ?? listing?.requested_currency?.name ?? 'Unknown',
	);
	const requestedImage = $derived(
		listing?.requested_item?.image_url ?? listing?.requested_currency?.image_url ?? '',
	);
</script>

<div class="my-1 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm max-w-sm">
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
		<ItemImage src={requestedImage} alt={requestedName} size="sm" />
		<div class="min-w-0 flex-1">
			<div class="mb-0.5 flex items-center gap-1.5">
				{#if listing.order_type === 'buy'}
					<Badge class="bg-green-500 text-white hover:bg-green-500">Buy</Badge>
				{:else}
					<Badge class="bg-amber-500 text-white hover:bg-amber-500">Sell</Badge>
				{/if}
				{#if listing.status !== 'active'}
					<Badge variant="secondary" class="capitalize">{listing.status}</Badge>
				{/if}
			</div>
			<p class="truncate text-sm font-semibold">
				{listing.amount}× {requestedName}
			</p>
		</div>
		<Button variant="outline" size="sm" href="/listings/view/{listing.id}">View</Button>
	{/if}
</div>
