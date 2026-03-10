<script lang="ts">
	import { AddListingForm } from '$lib/components';
	import type { ListingData } from '$lib/components/listing/AddListingForm.svelte';
	import type { Item, Currency } from '$lib/api/types';

	let { data } = $props();

	const items = $derived((data.items || []) as unknown as Item[]);
	const currencies = $derived((data.currencies || []) as unknown as Currency[]);

	const listing = $derived<ListingData>({
		id: data.listing.id,
		requested_item_id: data.listing.requested_item_id,
		requested_currency_id: data.listing.requested_currency_id,
		amount: data.listing.amount,
		order_type: data.listing.order_type,
		paying_type: data.listing.paying_type,
		offered_items: (data.listing.offered_items || []).map((o: any) => ({
			id: o.item.id,
			amount: o.amount,
		})),
		offered_currencies: (data.listing.offered_currencies || []).map((o: any) => ({
			id: o.currency.id,
			amount: o.amount,
		})),
	});
</script>

<div class="min-h-screen text-foreground">
	<div class="bg-card py-8 shadow-sm">
		<div class="mx-auto max-w-3xl px-8">
			<h1 class="text-3xl font-bold text-primary">Edit Listing</h1>
			<p class="mt-2 text-muted-foreground">
				Update your trade listing details
			</p>
		</div>
	</div>

	<div class="mx-auto max-w-3xl px-8 py-8">
		<AddListingForm {items} {currencies} {listing} />
	</div>
</div>
