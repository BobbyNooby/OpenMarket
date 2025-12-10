<script lang="ts">
	import ItemButton from './ItemButton.svelte';
	import Button from './Button.svelte';
	import type { Listing, ListingAuthor, ListingRequestedItem, ListingRequestedCurrency } from '$lib/api/types';

	interface Props {
		order: Listing;
		author: ListingAuthor;
		requestedItem?: ListingRequestedItem;
		requestedCurrency?: ListingRequestedCurrency;
		onContact?: () => void;
	}

	let { order, author, requestedItem, requestedCurrency, onContact }: Props = $props();

	// Get the requested thing (item or currency)
	const requestedName = $derived(requestedItem?.name ?? requestedCurrency?.name ?? 'Unknown');

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: '2-digit',
			day: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get items to display (either offered items or currencies)
	const displayItems = $derived(() => {
		const items: Array<{
			name: string;
			type: string;
			slug: string;
			description?: string;
			image_url?: string;
			amount: number;
		}> = [];

		if (order.offered_items) {
			order.offered_items.forEach((offered) => {
				items.push({
					name: offered.item.name,
					type: 'item',
					slug: offered.item.slug,
					description: offered.item.description ?? undefined,
					image_url: offered.item.image_url ?? '',
					amount: offered.amount
				});
			});
		}

		if (order.offered_currencies) {
			order.offered_currencies.forEach((offered) => {
				items.push({
					name: offered.currency.name,
					type: 'currency',
					slug: offered.currency.slug,
					description: offered.currency.description ?? undefined,
					image_url: offered.currency.image_url ?? '',
					amount: offered.amount
				});
			});
		}

		return items;
	});
</script>

<div
	class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] transition-all hover:shadow-[var(--shadow-lg)]"
>
	<!-- User Profile Section -->
	<a href="/profile/{author.username}" class="mb-4 flex items-center gap-3 transition-opacity hover:opacity-80">
		{#if author.avatar_url}
			<img
				src={author.avatar_url}
				alt={author.display_name}
				class="h-12 w-12 rounded-full bg-[var(--color-surface)] object-cover"
			/>
		{:else}
			<div
				class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-xl font-bold text-[var(--color-background)]"
			>
				{author.display_name.charAt(0).toUpperCase()}
			</div>
		{/if}
		<div class="flex-1">
			<h3 class="font-semibold text-[var(--color-text)]">{author.display_name}</h3>
			<p class="text-xs text-[var(--color-textTertiary)]">@{author.username}</p>
		</div>
	</a>

	<!-- Order Type Badge -->
	<div class="mb-3">
		<span
			class="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase"
			class:bg-[var(--color-success)]={order.order_type === 'buy'}
			class:bg-[var(--color-warning)]={order.order_type === 'sell'}
			class:text-[var(--color-background)]={true}
		>
			{order.order_type === 'buy' ? 'Buying' : 'Selling'}
		</span>
		<span class="ml-2 text-sm font-medium text-[var(--color-text)]">
			{order.amount}x {requestedName}
		</span>
	</div>

	<!-- Offered Items Grid -->
	<div class="mb-4 grid grid-cols-4 gap-3">
		{#each displayItems() as item, index}
			{#if index < 8}
				<ItemButton
					name={item.name}
					type={item.type}
					slug={item.slug}
					description={item.description}
					image_url={item.image_url}
					amount={item.amount}
				/>
			{/if}
		{/each}
		<!-- Empty slots -->
		{#each Array(Math.max(0, 8 - displayItems().length)) as _, index}
			<div
				class="h-16 w-16 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)]"
			></div>
		{/each}
	</div>

	<!-- Footer -->
	<div class="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
		<span class="text-xs text-[var(--color-textTertiary)]">
			Posted on {formatDate(order.created_at)}
		</span>
		<Button variant="primary" size="sm" onclick={onContact}>Contact</Button>
	</div>
</div>
