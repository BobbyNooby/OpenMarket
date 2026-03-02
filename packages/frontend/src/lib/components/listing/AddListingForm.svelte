<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import ItemButton from '../item/ItemButton.svelte';
	import type { Item, Currency } from '$lib/api/types';

	interface Props {
		items: Item[];
		currencies: Currency[];
		authorId: string;
	}

	let { items, currencies, authorId }: Props = $props();

	// Form state
	let requestType = $state<'item' | 'currency'>('item');
	let selectedRequestedId = $state<string>('');
	let amount = $state<number>(1);
	let orderType = $state<'buy' | 'sell'>('buy');
	let payingType = $state<'each' | 'total'>('each');

	// Offered items/currencies
	let offeredItems = $state<Array<{ id: string; amount: number }>>([]);
	let offeredCurrencies = $state<Array<{ id: string; amount: number }>>([]);

	// UI state
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);
	let showItemPicker = $state(false);
	let showCurrencyPicker = $state(false);

	const selectedRequested = $derived(() => {
		if (requestType === 'item') {
			return items.find((i) => i.id === selectedRequestedId);
		} else {
			return currencies.find((c) => c.id === selectedRequestedId);
		}
	});

	const itemOptions = $derived(
		items.map((item) => ({
			value: item.id,
			label: item.name
		}))
	);

	const currencyOptions = $derived(
		currencies.map((currency) => ({
			value: currency.id,
			label: currency.name
		}))
	);

	function getItem(id: string) {
		return items.find((i) => i.id === id);
	}

	function getCurrency(id: string) {
		return currencies.find((c) => c.id === id);
	}

	function addOfferedItem(itemId: string) {
		if (!offeredItems.some((o) => o.id === itemId)) {
			offeredItems = [...offeredItems, { id: itemId, amount: 1 }];
		}
		showItemPicker = false;
	}

	function addOfferedCurrency(currencyId: string) {
		if (!offeredCurrencies.some((o) => o.id === currencyId)) {
			offeredCurrencies = [...offeredCurrencies, { id: currencyId, amount: 1000 }];
		}
		showCurrencyPicker = false;
	}

	function removeOfferedItem(itemId: string) {
		offeredItems = offeredItems.filter((o) => o.id !== itemId);
	}

	function removeOfferedCurrency(currencyId: string) {
		offeredCurrencies = offeredCurrencies.filter((o) => o.id !== currencyId);
	}

	function updateOfferedItemAmount(itemId: string, newAmount: number) {
		offeredItems = offeredItems.map((o) => (o.id === itemId ? { ...o, amount: newAmount } : o));
	}

	function updateOfferedCurrencyAmount(currencyId: string, newAmount: number) {
		offeredCurrencies = offeredCurrencies.map((o) =>
			o.id === currencyId ? { ...o, amount: newAmount } : o
		);
	}

	async function handleSubmit() {
		if (!selectedRequestedId) {
			error = 'Please select what you want to trade';
			return;
		}

		if (offeredItems.length === 0 && offeredCurrencies.length === 0) {
			error = 'Please add at least one item or currency you are offering';
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			const formData = new FormData();
			formData.set('author_id', authorId);
			formData.set('amount', String(amount));
			formData.set('order_type', orderType);
			formData.set('paying_type', payingType);
			formData.set('offered_items', JSON.stringify(offeredItems.map((o) => ({ item_id: o.id, amount: o.amount }))));
			formData.set('offered_currencies', JSON.stringify(offeredCurrencies.map((o) => ({ currency_id: o.id, amount: o.amount }))));

			if (requestType === 'item') {
				formData.set('requested_item_id', selectedRequestedId);
			} else {
				formData.set('requested_currency_id', selectedRequestedId);
			}

			const res = await fetch('?/createListing', {
				method: 'POST',
				body: formData
			});

			if (res.redirected) {
				goto(res.url);
				return;
			}

			const result = await res.json();
			if (result.type === 'failure') {
				error = result.data?.error || 'Failed to create listing';
			} else {
				goto('/listings');
			}
		} catch (err: any) {
			error = err.message || 'An error occurred';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
	{#if error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{error}
		</div>
	{/if}

	<!-- Order Type -->
	<div>
		<span class="mb-2 block text-sm font-semibold text-foreground">Order Type</span>
		<div class="flex gap-2">
			<button
				type="button"
				class="flex-1 rounded-md px-4 py-3 text-sm font-medium transition-colors {orderType === 'buy' ? 'bg-green-500 text-white' : 'border border-border bg-card text-foreground'}"
				onclick={() => (orderType = 'buy')}
			>
				Buying
			</button>
			<button
				type="button"
				class="flex-1 rounded-md px-4 py-3 text-sm font-medium transition-colors {orderType === 'sell' ? 'bg-amber-500 text-white' : 'border border-border bg-card text-foreground'}"
				onclick={() => (orderType = 'sell')}
			>
				Selling
			</button>
		</div>
	</div>

	<!-- What you want -->
	<div class="rounded-lg border border-border bg-card p-4">
		<h3 class="mb-4 text-lg font-semibold text-foreground">
			What you want to {orderType === 'buy' ? 'buy' : 'sell'}
		</h3>

		<!-- Request type toggle -->
		<div class="mb-4">
			<span class="mb-2 block text-sm font-semibold text-foreground">Type</span>
			<div class="flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {requestType === 'item' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}"
					onclick={() => {
						requestType = 'item';
						selectedRequestedId = '';
					}}
				>
					Item
				</button>
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {requestType === 'currency' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}"
					onclick={() => {
						requestType = 'currency';
						selectedRequestedId = '';
					}}
				>
					Currency
				</button>
			</div>
		</div>

		<!-- Select item/currency -->
		<div class="mb-4 space-y-2">
			<Label for="request-select">Select {requestType === 'item' ? 'Item' : 'Currency'}</Label>
			<select
				id="request-select"
				bind:value={selectedRequestedId}
				class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			>
				<option value="">Choose {requestType === 'item' ? 'an item' : 'a currency'}...</option>
				{#each requestType === 'item' ? itemOptions : currencyOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>

		<!-- Amount -->
		<div class="mb-4 space-y-2">
			<Label for="amount">Amount</Label>
			<Input
				id="amount"
				type="number"
				bind:value={amount}
				min={1}
			/>
		</div>

		<!-- Paying type -->
		<div>
			<span class="mb-2 block text-sm font-semibold text-foreground">Price Type</span>
			<div class="flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {payingType === 'each' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}"
					onclick={() => (payingType = 'each')}
				>
					Per Item
				</button>
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {payingType === 'total' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}"
					onclick={() => (payingType = 'total')}
				>
					Total
				</button>
			</div>
		</div>

		<!-- Preview of selected item -->
		{#if selectedRequested()}
			<div class="mt-4 flex items-center gap-3 rounded-md bg-background p-3">
				<ItemButton
					name={selectedRequested()!.name}
					type={requestType}
					description={selectedRequested()!.description ?? ''}
					image_url={selectedRequested()!.image_url ?? ''}
					amount={amount}
				/>
				<div>
					<p class="font-semibold text-foreground">{amount}x {selectedRequested()!.name}</p>
					<p class="text-sm text-muted-foreground">{requestType}</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- What you're offering -->
	<div class="rounded-lg border border-border bg-card p-4">
		<h3 class="mb-4 text-lg font-semibold text-foreground">
			What you're offering in return
		</h3>

		<!-- Offered items grid -->
		<div class="mb-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-semibold text-foreground">Items</span>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => (showItemPicker = !showItemPicker)}
				>
					+ Add Item
				</Button>
			</div>

			{#if showItemPicker}
				<div class="mb-3 rounded-md border border-border bg-background p-3">
					<div class="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto">
						{#each items as item}
							<button
								type="button"
								class="rounded-md p-1 transition-colors hover:bg-card"
								class:opacity-50={offeredItems.some((o) => o.id === item.id) || item.id === selectedRequestedId}
								disabled={offeredItems.some((o) => o.id === item.id) || item.id === selectedRequestedId}
								onclick={() => addOfferedItem(item.id)}
							>
								<ItemButton
									name={item.name}
									type="item"
									description={item.description ?? ''}
									image_url={item.image_url ?? ''}
								/>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if offeredItems.length > 0}
				<div class="space-y-2">
					{#each offeredItems as offered}
						{@const item = getItem(offered.id)}
						{#if item}
							<div class="flex items-center gap-3 rounded-md bg-background p-2">
								<ItemButton
									name={item.name}
									type="item"
									description={item.description ?? ''}
									image_url={item.image_url ?? ''}
									amount={offered.amount}
								/>
								<div class="flex-1">
									<p class="text-sm font-medium text-foreground">{item.name}</p>
								</div>
								<input
									type="number"
									min="1"
									value={offered.amount}
									onchange={(e) => updateOfferedItemAmount(offered.id, parseInt(e.currentTarget.value) || 1)}
									class="w-20 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
								/>
								<button
									type="button"
									class="text-destructive hover:text-destructive/80"
									onclick={() => removeOfferedItem(offered.id)}
								>
									&times;
								</button>
							</div>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No items added yet</p>
			{/if}
		</div>

		<!-- Offered currencies -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-semibold text-foreground">Currencies</span>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => (showCurrencyPicker = !showCurrencyPicker)}
				>
					+ Add Currency
				</Button>
			</div>

			{#if showCurrencyPicker}
				<div class="mb-3 rounded-md border border-border bg-background p-3">
					<div class="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto">
						{#each currencies as currency}
							<button
								type="button"
								class="rounded-md p-1 transition-colors hover:bg-card"
								class:opacity-50={offeredCurrencies.some((o) => o.id === currency.id) || currency.id === selectedRequestedId}
								disabled={offeredCurrencies.some((o) => o.id === currency.id) || currency.id === selectedRequestedId}
								onclick={() => addOfferedCurrency(currency.id)}
							>
								<ItemButton
									name={currency.name}
									type="currency"
									description={currency.description ?? ''}
									image_url={currency.image_url ?? ''}
								/>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if offeredCurrencies.length > 0}
				<div class="space-y-2">
					{#each offeredCurrencies as offered}
						{@const currency = getCurrency(offered.id)}
						{#if currency}
							<div class="flex items-center gap-3 rounded-md bg-background p-2">
								<ItemButton
									name={currency.name}
									type="currency"
									description={currency.description ?? ''}
									image_url={currency.image_url ?? ''}
									amount={offered.amount}
								/>
								<div class="flex-1">
									<p class="text-sm font-medium text-foreground">{currency.name}</p>
								</div>
								<input
									type="number"
									min="1"
									value={offered.amount}
									onchange={(e) => updateOfferedCurrencyAmount(offered.id, parseInt(e.currentTarget.value) || 1)}
									class="w-24 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
								/>
								<button
									type="button"
									class="text-destructive hover:text-destructive/80"
									onclick={() => removeOfferedCurrency(offered.id)}
								>
									&times;
								</button>
							</div>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No currencies added yet</p>
			{/if}
		</div>
	</div>

	<!-- Submit -->
	<div class="flex gap-3">
		<Button type="button" variant="outline" class="flex-1" onclick={() => goto('/listings')}>
			Cancel
		</Button>
		<Button type="submit" class="flex-1" disabled={isSubmitting}>
			{isSubmitting ? 'Creating...' : 'Create Listing'}
		</Button>
	</div>
</form>
