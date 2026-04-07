<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import ItemButton from './ItemButton.svelte';
	import type { Item, Currency } from '$lib/api/types';

	export type PickerKind = 'item' | 'currency';
	export type PickerSelection =
		| { kind: 'item'; item: Item }
		| { kind: 'currency'; currency: Currency };

	interface Props {
		items: Item[];
		currencies: Currency[];
		// 'both' shows a toggle; 'item' or 'currency' locks the picker
		mode?: 'both' | 'item' | 'currency';
		excludeItemIds?: string[];
		excludeCurrencyIds?: string[];
		onSelect: (selection: PickerSelection) => void;
	}

	let {
		items,
		currencies,
		mode = 'both',
		excludeItemIds = [],
		excludeCurrencyIds = [],
		onSelect,
	}: Props = $props();

	let activeKind = $state<PickerKind>(mode === 'currency' ? 'currency' : 'item');
	let search = $state('');

	const filteredItems = $derived(
		items.filter((i) => {
			if (excludeItemIds.includes(i.id)) return false;
			if (!search.trim()) return true;
			return i.name.toLowerCase().includes(search.trim().toLowerCase());
		}),
	);

	const filteredCurrencies = $derived(
		currencies.filter((c) => {
			if (excludeCurrencyIds.includes(c.id)) return false;
			if (!search.trim()) return true;
			return c.name.toLowerCase().includes(search.trim().toLowerCase());
		}),
	);
</script>

<div class="rounded-md border border-border bg-background p-3">
	{#if mode === 'both'}
		<div class="mb-3 flex gap-2">
			<button
				type="button"
				class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {activeKind === 'item' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}"
				onclick={() => (activeKind = 'item')}
			>
				Items
			</button>
			<button
				type="button"
				class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {activeKind === 'currency' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}"
				onclick={() => (activeKind = 'currency')}
			>
				Currencies
			</button>
		</div>
	{/if}

	<Input
		type="text"
		placeholder="Search {activeKind === 'item' ? 'items' : 'currencies'}..."
		bind:value={search}
		class="mb-3"
	/>

	<div class="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto">
		{#if activeKind === 'item'}
			{#each filteredItems as item (item.id)}
				<button
					type="button"
					class="rounded-md p-1 transition-colors hover:bg-card"
					onclick={() => onSelect({ kind: 'item', item })}
				>
					<ItemButton
						name={item.name}
						type="item"
						description={item.description ?? ''}
						image_url={item.image_url ?? ''}
					/>
				</button>
			{:else}
				<p class="col-span-6 py-4 text-center text-sm text-muted-foreground">
					No items found
				</p>
			{/each}
		{:else}
			{#each filteredCurrencies as currency (currency.id)}
				<button
					type="button"
					class="rounded-md p-1 transition-colors hover:bg-card"
					onclick={() => onSelect({ kind: 'currency', currency })}
				>
					<ItemButton
						name={currency.name}
						type="currency"
						description={currency.description ?? ''}
						image_url={currency.image_url ?? ''}
					/>
				</button>
			{:else}
				<p class="col-span-6 py-4 text-center text-sm text-muted-foreground">
					No currencies found
				</p>
			{/each}
		{/if}
	</div>
</div>
