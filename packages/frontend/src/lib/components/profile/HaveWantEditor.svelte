<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Button } from '$lib/components/ui/button';
	import ItemButton from '../item/ItemButton.svelte';
	import ItemPicker, { type PickerSelection } from '../item/ItemPicker.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';
	import type { Item, Currency } from '$lib/api/types';

	type ListEntry = {
		id: string;
		kind: 'item' | 'currency';
		ref_id: string; // item_id or currency_id
		name: string;
		image_url: string | null;
		description: string | null;
	};

	interface Props {
		items: Item[];
		currencies: Currency[];
		initialHave: ListEntry[];
		initialWant: ListEntry[];
	}

	let { items, currencies, initialHave, initialWant }: Props = $props();

	const MAX = 50;

	let have = $state<ListEntry[]>(initialHave);
	let want = $state<ListEntry[]>(initialWant);

	let showHavePicker = $state(false);
	let showWantPicker = $state(false);

	async function addEntry(listType: 'have' | 'want', selection: PickerSelection) {
		const current = listType === 'have' ? have : want;
		if (current.length >= MAX) {
			toast.error(`You can only have ${MAX} entries in your ${listType} list`);
			return;
		}

		const refId = selection.kind === 'item' ? selection.item.id : selection.currency.id;
		const already = current.some((e) => e.kind === selection.kind && e.ref_id === refId);
		if (already) {
			toast.info('Already in your list');
			return;
		}

		// Optimistic add with a temporary id
		const tempId = `tmp-${crypto.randomUUID()}`;
		const entry: ListEntry =
			selection.kind === 'item'
				? {
						id: tempId,
						kind: 'item',
						ref_id: selection.item.id,
						name: selection.item.name,
						image_url: selection.item.image_url ?? null,
						description: selection.item.description ?? null,
					}
				: {
						id: tempId,
						kind: 'currency',
						ref_id: selection.currency.id,
						name: selection.currency.name,
						image_url: selection.currency.image_url ?? null,
						description: selection.currency.description ?? null,
					};

		if (listType === 'have') have = [...have, entry];
		else want = [...want, entry];

		if (listType === 'have') showHavePicker = false;
		else showWantPicker = false;

		try {
			const res = await fetch(`${PUBLIC_API_URL}/lists`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					list_type: listType,
					item_id: selection.kind === 'item' ? selection.item.id : undefined,
					currency_id: selection.kind === 'currency' ? selection.currency.id : undefined,
				}),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error ?? 'Failed to add');

			// Replace the temp id with the real one
			const realId = json.data.id;
			if (listType === 'have') {
				have = have.map((e) => (e.id === tempId ? { ...e, id: realId } : e));
			} else {
				want = want.map((e) => (e.id === tempId ? { ...e, id: realId } : e));
			}
		} catch (err: any) {
			// Rollback
			if (listType === 'have') have = have.filter((e) => e.id !== tempId);
			else want = want.filter((e) => e.id !== tempId);
			toast.error(err?.message ?? 'Failed to add entry');
		}
	}

	async function removeEntry(listType: 'have' | 'want', entry: ListEntry) {
		// Optimistic remove
		const snapshot = listType === 'have' ? have : want;
		if (listType === 'have') have = have.filter((e) => e.id !== entry.id);
		else want = want.filter((e) => e.id !== entry.id);

		try {
			const res = await fetch(`${PUBLIC_API_URL}/lists/${entry.id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error ?? 'Failed to remove');
		} catch (err: any) {
			// Rollback
			if (listType === 'have') have = snapshot;
			else want = snapshot;
			toast.error(err?.message ?? 'Failed to remove entry');
		}
	}

	// Build exclude lists so the picker hides already-added entries
	const haveExcludeItems = $derived(
		have.filter((e) => e.kind === 'item').map((e) => e.ref_id),
	);
	const haveExcludeCurrencies = $derived(
		have.filter((e) => e.kind === 'currency').map((e) => e.ref_id),
	);
	const wantExcludeItems = $derived(
		want.filter((e) => e.kind === 'item').map((e) => e.ref_id),
	);
	const wantExcludeCurrencies = $derived(
		want.filter((e) => e.kind === 'currency').map((e) => e.ref_id),
	);
</script>

<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
	<!-- Have -->
	<div>
		<div class="mb-3 flex items-center justify-between">
			<div>
				<h3 class="text-sm font-semibold text-foreground">I have</h3>
				<p class="text-xs text-muted-foreground">Items others can trade for</p>
			</div>
			<span class="text-xs text-muted-foreground">{have.length} / {MAX}</span>
		</div>

		{#if have.length === 0}
			<p class="mb-3 rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
				Nothing in your have list yet.
			</p>
		{:else}
			<div class="mb-3 space-y-2">
				{#each have as entry (entry.id)}
					<div class="flex items-center gap-3 rounded-md bg-background p-2">
						<ItemButton
							name={entry.name}
							type={entry.kind}
							description={entry.description ?? ''}
							image_url={entry.image_url ?? ''}
						/>
						<div class="flex-1">
							<p class="text-sm font-medium text-foreground">{entry.name}</p>
							<p class="text-xs text-muted-foreground">{entry.kind}</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							class="text-muted-foreground hover:text-destructive"
							onclick={() => removeEntry('have', entry)}
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{/each}
			</div>
		{/if}

		{#if showHavePicker}
			<ItemPicker
				{items}
				{currencies}
				excludeItemIds={haveExcludeItems}
				excludeCurrencyIds={haveExcludeCurrencies}
				onSelect={(selection) => addEntry('have', selection)}
			/>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="mt-2 w-full"
				onclick={() => (showHavePicker = false)}
			>
				Cancel
			</Button>
		{:else}
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="w-full"
				disabled={have.length >= MAX}
				onclick={() => (showHavePicker = true)}
			>
				<Plus class="mr-1.5 h-4 w-4" />
				Add to have list
			</Button>
		{/if}
	</div>

	<!-- Want -->
	<div>
		<div class="mb-3 flex items-center justify-between">
			<div>
				<h3 class="text-sm font-semibold text-foreground">I want</h3>
				<p class="text-xs text-muted-foreground">Items you're looking for</p>
			</div>
			<span class="text-xs text-muted-foreground">{want.length} / {MAX}</span>
		</div>

		{#if want.length === 0}
			<p class="mb-3 rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
				Nothing in your want list yet.
			</p>
		{:else}
			<div class="mb-3 space-y-2">
				{#each want as entry (entry.id)}
					<div class="flex items-center gap-3 rounded-md bg-background p-2">
						<ItemButton
							name={entry.name}
							type={entry.kind}
							description={entry.description ?? ''}
							image_url={entry.image_url ?? ''}
						/>
						<div class="flex-1">
							<p class="text-sm font-medium text-foreground">{entry.name}</p>
							<p class="text-xs text-muted-foreground">{entry.kind}</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							class="text-muted-foreground hover:text-destructive"
							onclick={() => removeEntry('want', entry)}
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{/each}
			</div>
		{/if}

		{#if showWantPicker}
			<ItemPicker
				{items}
				{currencies}
				excludeItemIds={wantExcludeItems}
				excludeCurrencyIds={wantExcludeCurrencies}
				onSelect={(selection) => addEntry('want', selection)}
			/>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="mt-2 w-full"
				onclick={() => (showWantPicker = false)}
			>
				Cancel
			</Button>
		{:else}
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="w-full"
				disabled={want.length >= MAX}
				onclick={() => (showWantPicker = true)}
			>
				<Plus class="mr-1.5 h-4 w-4" />
				Add to want list
			</Button>
		{/if}
	</div>
</div>
