<script lang="ts">
	import ItemButton from '../item/ItemButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import ReportDialog from '../report/ReportDialog.svelte';
	import Flag from '@lucide/svelte/icons/flag';
	import Pencil from '@lucide/svelte/icons/pencil';
	import type { TransformedListing } from '$lib/utils/listings';

	interface Props {
		order: TransformedListing;
		onContact?: () => void;
		sessionUserId?: string | null;
	}

	let { order, onContact, sessionUserId = null }: Props = $props();

	let reportDialogOpen = $state(false);
	const canReport = $derived(sessionUserId && sessionUserId !== order.author.id);
	const canEdit = $derived(sessionUserId && sessionUserId === order.author.id);

	const author = $derived(order.author);
	const requestedItem = $derived(order.requested_item);
	const requestedCurrency = $derived(order.requested_currency);

	const requested = $derived(requestedItem ?? requestedCurrency);
	const requestedName = $derived(requested?.name ?? 'Unknown');
	const requestedImage = $derived(requested?.image_url ?? '');
	const requestedSlug = $derived(requested?.slug ?? '');

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

	function timeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		const weeks = Math.floor(days / 7);
		if (weeks < 4) return `${weeks}w ago`;
		const months = Math.floor(days / 30);
		return `${months}mo ago`;
	}
</script>

<Card.Root class="gap-3 py-4">
	<Card.Header>
		<Card.Title>
			<a
				href="/listings?item={requestedSlug}"
				class="text-lg font-semibold text-foreground transition-colors hover:text-primary"
			>
				{requestedName}
			</a>
		</Card.Title>
		<Card.Action>
			{#if order.order_type === 'buy'}
				<Badge class="bg-green-500 text-white hover:bg-green-500">Buy</Badge>
			{:else}
				<Badge class="bg-amber-500 text-white hover:bg-amber-500">Sell</Badge>
			{/if}
		</Card.Action>
	</Card.Header>

	<Card.Content class="space-y-2">
		<div class="flex items-center gap-4">
			<ItemButton
				name={requestedName}
				type={requestedItem ? 'item' : 'currency'}
				slug={requestedSlug}
				description={requested?.description ?? undefined}
				image_url={requestedImage}
				amount={order.amount}
			/>

			<svg
				class="h-5 w-5 shrink-0 text-muted-foreground"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				{#if order.order_type === 'buy'}
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				{:else}
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M14 5l7 7m0 0l-7 7m7-7H3"
					/>
				{/if}
			</svg>

			<div class="flex flex-wrap gap-2">
				{#each displayItems() as item}
					<ItemButton
						name={item.name}
						type={item.type}
						slug={item.slug}
						description={item.description}
						image_url={item.image_url}
						amount={item.amount}
					/>
				{/each}
				{#if displayItems().length === 0}
					<div
						class="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground"
					>
						?
					</div>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-3 text-xs text-muted-foreground">
			<span class="flex items-center gap-1" title="Stock">
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
					/>
				</svg>
				{order.amount}
			</span>
			<Badge variant="outline" class="text-xs">
				{order.paying_type === 'each' ? 'each' : 'total'}
			</Badge>
		</div>
	</Card.Content>

	<Separator />

	<Card.Footer class="justify-between">
		<a
			href="/profile/{author.username}"
			class="text-sm text-muted-foreground transition-colors hover:text-primary"
		>
			@{author.username}
		</a>
		<div class="flex items-center gap-4">
			<span class="text-xs text-muted-foreground">
				{timeAgo(order.created_at)}
			</span>
			{#if canEdit}
				<Button
					size="sm"
					variant="ghost"
					class="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
					href="/listings/{order.id}/edit"
					title="Edit listing"
				>
					<Pencil class="h-4 w-4" />
				</Button>
			{/if}
			{#if canReport}
				<Button
					size="sm"
					variant="ghost"
					class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
					onclick={() => (reportDialogOpen = true)}
					title="Report listing"
				>
					<Flag class="h-4 w-4" />
				</Button>
			{/if}
			<Button size="sm" onclick={onContact}>Contact</Button>
		</div>
	</Card.Footer>
</Card.Root>

{#if canReport}
	<ReportDialog
		bind:open={reportDialogOpen}
		targetType="listing"
		targetId={order.id}
		targetLabel="this listing"
	/>
{/if}
