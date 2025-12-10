<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from './Button.svelte';
	import Select from './Select.svelte';
	import Input from './Input.svelte';
	import ItemButton from './ItemButton.svelte';
	import type { Item, Currency } from '$lib/api/types';
	import { api } from '$lib/api/client';

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

	// Get selected item/currency details
	const selectedRequested = $derived(() => {
		if (requestType === 'item') {
			return items.find((i) => i.id === selectedRequestedId);
		} else {
			return currencies.find((c) => c.id === selectedRequestedId);
		}
	});

	// Options for select
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

	// Get item/currency by id
	function getItem(id: string) {
		return items.find((i) => i.id === id);
	}

	function getCurrency(id: string) {
		return currencies.find((c) => c.id === id);
	}

	// Add offered item
	function addOfferedItem(itemId: string) {
		if (!offeredItems.some((o) => o.id === itemId)) {
			offeredItems = [...offeredItems, { id: itemId, amount: 1 }];
		}
		showItemPicker = false;
	}

	// Add offered currency
	function addOfferedCurrency(currencyId: string) {
		if (!offeredCurrencies.some((o) => o.id === currencyId)) {
			offeredCurrencies = [...offeredCurrencies, { id: currencyId, amount: 1000 }];
		}
		showCurrencyPicker = false;
	}

	// Remove offered item
	function removeOfferedItem(itemId: string) {
		offeredItems = offeredItems.filter((o) => o.id !== itemId);
	}

	// Remove offered currency
	function removeOfferedCurrency(currencyId: string) {
		offeredCurrencies = offeredCurrencies.filter((o) => o.id !== currencyId);
	}

	// Update offered item amount
	function updateOfferedItemAmount(itemId: string, newAmount: number) {
		offeredItems = offeredItems.map((o) => (o.id === itemId ? { ...o, amount: newAmount } : o));
	}

	// Update offered currency amount
	function updateOfferedCurrencyAmount(currencyId: string, newAmount: number) {
		offeredCurrencies = offeredCurrencies.map((o) =>
			o.id === currencyId ? { ...o, amount: newAmount } : o
		);
	}

	// Submit form
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
			const body: any = {
				author_id: authorId,
				amount,
				order_type: orderType,
				paying_type: payingType,
				offered_items: offeredItems.map((o) => ({ item_id: o.id, amount: o.amount })),
				offered_currencies: offeredCurrencies.map((o) => ({
					currency_id: o.id,
					amount: o.amount
				}))
			};

			if (requestType === 'item') {
				body.requested_item_id = selectedRequestedId;
			} else {
				body.requested_currency_id = selectedRequestedId;
			}

			// @ts-expect-error - Eden treaty type inference
			const result = await api.listings.post(body);

			if (result.data?.success) {
				goto('/listings');
			} else {
				error = result.data?.error || 'Failed to create listing';
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
		<div class="rounded-[var(--radius-md)] bg-[var(--color-error)] bg-opacity-10 p-4 text-[var(--color-error)]">
			{error}
		</div>
	{/if}

	<!-- Order Type -->
	<div>
		<span class="mb-2 block text-sm font-semibold text-[var(--color-text)]">Order Type</span>
		<div class="flex gap-2">
			<button
				type="button"
				class="flex-1 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors"
				class:bg-[var(--color-success)]={orderType === 'buy'}
				class:text-white={orderType === 'buy'}
				class:bg-[var(--color-surface)]={orderType !== 'buy'}
				class:text-[var(--color-text)]={orderType !== 'buy'}
				class:border={orderType !== 'buy'}
				class:border-[var(--color-border)]={orderType !== 'buy'}
				onclick={() => (orderType = 'buy')}
			>
				Buying
			</button>
			<button
				type="button"
				class="flex-1 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors"
				class:bg-[var(--color-warning)]={orderType === 'sell'}
				class:text-white={orderType === 'sell'}
				class:bg-[var(--color-surface)]={orderType !== 'sell'}
				class:text-[var(--color-text)]={orderType !== 'sell'}
				class:border={orderType !== 'sell'}
				class:border-[var(--color-border)]={orderType !== 'sell'}
				onclick={() => (orderType = 'sell')}
			>
				Selling
			</button>
		</div>
	</div>

	<!-- What you want -->
	<div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
		<h3 class="mb-4 text-lg font-semibold text-[var(--color-text)]">
			What you want to {orderType === 'buy' ? 'buy' : 'sell'}
		</h3>

		<!-- Request type toggle -->
		<div class="mb-4">
			<span class="mb-2 block text-sm font-semibold text-[var(--color-text)]">Type</span>
			<div class="flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
					class:bg-[var(--color-primary)]={requestType === 'item'}
					class:text-white={requestType === 'item'}
					class:bg-[var(--color-background)]={requestType !== 'item'}
					class:text-[var(--color-text)]={requestType !== 'item'}
					onclick={() => {
						requestType = 'item';
						selectedRequestedId = '';
					}}
				>
					Item
				</button>
				<button
					type="button"
					class="flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
					class:bg-[var(--color-primary)]={requestType === 'currency'}
					class:text-white={requestType === 'currency'}
					class:bg-[var(--color-background)]={requestType !== 'currency'}
					class:text-[var(--color-text)]={requestType !== 'currency'}
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
		<div class="mb-4">
			{#if requestType === 'item'}
				<Select
					label="Select Item"
					options={itemOptions}
					bind:value={selectedRequestedId}
					placeholder="Choose an item..."
					required
				/>
			{:else}
				<Select
					label="Select Currency"
					options={currencyOptions}
					bind:value={selectedRequestedId}
					placeholder="Choose a currency..."
					required
				/>
			{/if}
		</div>

		<!-- Amount -->
		<div class="mb-4">
			<Input
				type="number"
				label="Amount"
				bind:value={amount}
				min={1}
				required
			/>
		</div>

		<!-- Paying type -->
		<div>
			<span class="mb-2 block text-sm font-semibold text-[var(--color-text)]">Price Type</span>
			<div class="flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
					class:bg-[var(--color-primary)]={payingType === 'each'}
					class:text-white={payingType === 'each'}
					class:bg-[var(--color-background)]={payingType !== 'each'}
					class:text-[var(--color-text)]={payingType !== 'each'}
					onclick={() => (payingType = 'each')}
				>
					Per Item
				</button>
				<button
					type="button"
					class="flex-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
					class:bg-[var(--color-primary)]={payingType === 'total'}
					class:text-white={payingType === 'total'}
					class:bg-[var(--color-background)]={payingType !== 'total'}
					class:text-[var(--color-text)]={payingType !== 'total'}
					onclick={() => (payingType = 'total')}
				>
					Total
				</button>
			</div>
		</div>

		<!-- Preview of selected item -->
		{#if selectedRequested()}
			<div class="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-background)] p-3">
				<ItemButton
					name={selectedRequested()!.name}
					type={requestType}
					description={selectedRequested()!.description ?? ''}
					image_url={selectedRequested()!.image_url ?? ''}
					amount={amount}
				/>
				<div>
					<p class="font-semibold text-[var(--color-text)]">{amount}x {selectedRequested()!.name}</p>
					<p class="text-sm text-[var(--color-textSecondary)]">{requestType}</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- What you're offering -->
	<div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
		<h3 class="mb-4 text-lg font-semibold text-[var(--color-text)]">
			What you're offering in return
		</h3>

		<!-- Offered items grid -->
		<div class="mb-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-semibold text-[var(--color-text)]">Items</span>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => (showItemPicker = !showItemPicker)}
				>
					+ Add Item
				</Button>
			</div>

			{#if showItemPicker}
				<div class="mb-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
					<div class="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto">
						{#each items as item}
							<button
								type="button"
								class="rounded-[var(--radius-md)] p-1 transition-colors hover:bg-[var(--color-surface)]"
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
							<div class="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-background)] p-2">
								<ItemButton
									name={item.name}
									type="item"
									description={item.description ?? ''}
									image_url={item.image_url ?? ''}
									amount={offered.amount}
								/>
								<div class="flex-1">
									<p class="text-sm font-medium text-[var(--color-text)]">{item.name}</p>
								</div>
								<input
									type="number"
									min="1"
									value={offered.amount}
									onchange={(e) => updateOfferedItemAmount(offered.id, parseInt(e.currentTarget.value) || 1)}
									class="w-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)]"
								/>
								<button
									type="button"
									class="text-[var(--color-error)] hover:text-[var(--color-error)]"
									onclick={() => removeOfferedItem(offered.id)}
								>
									&times;
								</button>
							</div>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-sm text-[var(--color-textTertiary)]">No items added yet</p>
			{/if}
		</div>

		<!-- Offered currencies -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-semibold text-[var(--color-text)]">Currencies</span>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => (showCurrencyPicker = !showCurrencyPicker)}
				>
					+ Add Currency
				</Button>
			</div>

			{#if showCurrencyPicker}
				<div class="mb-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
					<div class="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto">
						{#each currencies as currency}
							<button
								type="button"
								class="rounded-[var(--radius-md)] p-1 transition-colors hover:bg-[var(--color-surface)]"
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
							<div class="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-background)] p-2">
								<ItemButton
									name={currency.name}
									type="currency"
									description={currency.description ?? ''}
									image_url={currency.image_url ?? ''}
									amount={offered.amount}
								/>
								<div class="flex-1">
									<p class="text-sm font-medium text-[var(--color-text)]">{currency.name}</p>
								</div>
								<input
									type="number"
									min="1"
									value={offered.amount}
									onchange={(e) => updateOfferedCurrencyAmount(offered.id, parseInt(e.currentTarget.value) || 1)}
									class="w-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)]"
								/>
								<button
									type="button"
									class="text-[var(--color-error)] hover:text-[var(--color-error)]"
									onclick={() => removeOfferedCurrency(offered.id)}
								>
									&times;
								</button>
							</div>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="text-sm text-[var(--color-textTertiary)]">No currencies added yet</p>
			{/if}
		</div>
	</div>

	<!-- Submit -->
	<div class="flex gap-3">
		<Button type="button" variant="secondary" class="flex-1" onclick={() => goto('/listings')}>
			Cancel
		</Button>
		<Button type="submit" variant="primary" class="flex-1" disabled={isSubmitting}>
			{isSubmitting ? 'Creating...' : 'Create Listing'}
		</Button>
	</div>
</form>
