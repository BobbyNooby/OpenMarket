<script lang="ts">
	import { goto } from '$app/navigation';
	import ItemButton from '../item/ItemButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import ReportDialog from '../report/ReportDialog.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Flag from '@lucide/svelte/icons/flag';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CirclePause from '@lucide/svelte/icons/circle-pause';
	import CirclePlay from '@lucide/svelte/icons/circle-play';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { toast } from 'svelte-sonner';
	import { track } from '$lib/utils/analytics';
	import type { TransformedListing } from '$lib/utils/listings';

	interface Props {
		order: TransformedListing;
		onContact?: () => void;
		sessionUserId?: string | null;
	}

	let { order, onContact, sessionUserId = null }: Props = $props();

	async function defaultContact() {
		if (!sessionUserId) return;
		track('listing_contact', { listing_id: order.id, author_id: order.author_id });
		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/conversations`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					target_user_id: order.author_id,
					listing_id: order.id
				})
			});
			const json = await res.json();
			if (json.success) {
				goto(`/messages?conv=${json.data.id}`);
			}
		} catch {
			toast.error('Failed to start conversation');
		}
	}

	const handleContact = $derived(onContact ?? defaultContact);

	// Track listing view once when card enters viewport
	let viewTracked = false;
	let cardRef = $state<HTMLElement | null>(null);
	$effect(() => {
		if (!cardRef || viewTracked) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !viewTracked) {
					viewTracked = true;
					track('listing_view', { listing_id: order.id, source: 'browse' });
					observer.disconnect();
				}
			},
			{ threshold: 0.5 }
		);
		observer.observe(cardRef);
		return () => observer.disconnect();
	});

	let reportDialogOpen = $state(false);
	let soldDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let statusUpdating = $state(false);
	let deleted = $state(false);
	let currentStatus = $state(order.status);
	let currentExpiresAt = $state(order.expires_at);
	const canReport = $derived(sessionUserId && sessionUserId !== order.author.id);
	const canEdit = $derived(sessionUserId && sessionUserId === order.author.id);

	const expiryInfo = $derived(() => {
		if (!currentExpiresAt || currentStatus !== 'active') return null;
		const now = new Date();
		const expires = new Date(currentExpiresAt);
		const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		if (daysLeft <= 0) return { text: 'Expired', urgent: true };
		if (daysLeft <= 3) return { text: `${daysLeft}d left`, urgent: true };
		return { text: `${daysLeft}d left`, urgent: false };
	});

	const showRenewButton = $derived(() => {
		if (!canEdit || !currentExpiresAt) return false;
		if (currentStatus === 'expired') return true;
		if (currentStatus !== 'active') return false;
		const daysLeft = Math.ceil((new Date(currentExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
		return daysLeft <= 3;
	});

	const statusConfig: Record<string, { label: string; class: string }> = {
		active: { label: 'Active', class: 'bg-green-500 text-white hover:bg-green-500' },
		sold: { label: 'Sold', class: 'bg-red-500 text-white hover:bg-red-500' },
		paused: { label: 'Paused', class: 'bg-yellow-500 text-white hover:bg-yellow-500' },
		expired: { label: 'Expired', class: 'bg-gray-500 text-white hover:bg-gray-500' },
	};

	async function updateStatus(newStatus: 'active' | 'paused') {
		statusUpdating = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/listings/${order.id}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ status: newStatus }),
			});
			const result = await res.json();
			if (result.success) {
				currentStatus = newStatus;
				toast.success(`Listing marked as ${newStatus}`);
			} else {
				toast.error(result.error || 'Failed to update status');
			}
		} catch {
			toast.error('Failed to update status');
		} finally {
			statusUpdating = false;
		}
	}

	async function deleteListing(buyerId?: string | null) {
		statusUpdating = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/listings/${order.id}`, {
				method: 'DELETE',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: buyerId ? JSON.stringify({ buyer_id: buyerId }) : undefined,
			});
			const result = await res.json();
			if (result.success) {
				deleted = true;
				toast.success(buyerId ? 'Listing marked as sold' : 'Listing deleted');
			} else {
				toast.error(result.error || 'Failed to delete listing');
			}
		} catch {
			toast.error('Failed to delete listing');
		} finally {
			statusUpdating = false;
		}
	}

	// Buyer selection state for sold dialog
	let conversationContacts = $state<{ user_id: string; username: string; avatar: string | null }[]>([]);
	let selectedBuyerId = $state<string>('');
	let loadingContacts = $state(false);

	async function loadContacts() {
		if (conversationContacts.length > 0) return;
		loadingContacts = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/listings/${order.id}/contacts`, {
				credentials: 'include',
			});
			const result = await res.json();
			if (result.success) {
				conversationContacts = result.data ?? [];
			}
		} catch {
			// silently fail
		} finally {
			loadingContacts = false;
		}
	}

	$effect(() => {
		if (soldDialogOpen) loadContacts();
	});

	async function markAsSold() {
		await deleteListing(selectedBuyerId || null);
	}

	async function renewListing() {
		statusUpdating = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/listings/${order.id}/renew`, {
				method: 'PATCH',
				credentials: 'include',
			});
			const result = await res.json();
			if (result.success) {
				currentStatus = 'active';
				currentExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
				toast.success('Listing renewed for 30 days');
			} else {
				toast.error(result.error || 'Failed to renew listing');
			}
		} catch {
			toast.error('Failed to renew listing');
		} finally {
			statusUpdating = false;
		}
	}

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

{#if !deleted}
<Card.Root bind:ref={cardRef} class="gap-3 py-4">
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
			<div class="flex items-center gap-1.5">
				{#if currentStatus !== 'active'}
					<Badge class={statusConfig[currentStatus]?.class}>{statusConfig[currentStatus]?.label}</Badge>
				{/if}
				{#if order.order_type === 'buy'}
					<Badge class="bg-green-500 text-white hover:bg-green-500">Buy</Badge>
				{:else}
					<Badge class="bg-amber-500 text-white hover:bg-amber-500">Sell</Badge>
				{/if}
				{#if canEdit}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button size="sm" variant="ghost" class="h-8 w-8 p-0 text-muted-foreground">
								<Ellipsis class="h-4 w-4" />
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							{#if currentStatus === 'active'}
								<DropdownMenu.Item onclick={() => updateStatus('paused')} disabled={statusUpdating}>
									<CirclePause class="mr-2 h-4 w-4 text-yellow-500" />
									Pause
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => (soldDialogOpen = true)} disabled={statusUpdating}>
									<CircleCheck class="mr-2 h-4 w-4 text-red-500" />
									Mark as Sold
								</DropdownMenu.Item>
							{:else if currentStatus === 'paused' || currentStatus === 'expired'}
								<DropdownMenu.Item onclick={() => updateStatus('active')} disabled={statusUpdating}>
									<CirclePlay class="mr-2 h-4 w-4 text-green-500" />
									Reactivate
								</DropdownMenu.Item>
							{/if}
							{#if showRenewButton()}
								<DropdownMenu.Item onclick={renewListing} disabled={statusUpdating}>
									<RefreshCw class="mr-2 h-4 w-4 text-blue-500" />
									Renew (30 days)
								</DropdownMenu.Item>
							{/if}
							{#if currentStatus !== 'sold'}
								<a href="/listings/{order.id}/edit" class="contents">
									<DropdownMenu.Item>
										<Pencil class="mr-2 h-4 w-4" />
										Edit
									</DropdownMenu.Item>
								</a>
							{/if}
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={() => (deleteDialogOpen = true)} disabled={statusUpdating} class="text-destructive">
								<Trash2 class="mr-2 h-4 w-4" />
								Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</div>
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
		<div class="flex items-center gap-3">
			<span class="text-xs text-muted-foreground">
				{timeAgo(order.created_at)}
			</span>
			{#if expiryInfo()}
				<span class="text-xs {expiryInfo()?.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground'}">
					{expiryInfo()?.text}
				</span>
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
			{#if canReport}
			<Button size="sm" onclick={handleContact}>Contact</Button>
		{/if}
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

{#if canEdit}
	<AlertDialog.Root bind:open={soldDialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Mark as Sold</AlertDialog.Title>
				<AlertDialog.Description>
					This will remove the listing from the marketplace and save it as a completed trade in your history.
				</AlertDialog.Description>
			</AlertDialog.Header>

			<div class="py-2">
				<label for="buyer-select" class="mb-2 block text-sm font-medium">Buyer (optional)</label>
				{#if loadingContacts}
					<p class="text-xs text-muted-foreground">Loading contacts...</p>
				{:else if conversationContacts.length === 0}
					<p class="text-xs text-muted-foreground">No contacts found. The trade will be saved without a buyer.</p>
				{:else}
					<select
						id="buyer-select"
						bind:value={selectedBuyerId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">— Select buyer —</option>
						{#each conversationContacts as contact}
							<option value={contact.user_id}>@{contact.username}</option>
						{/each}
					</select>
				{/if}
			</div>

			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action onclick={markAsSold}>
					Mark as Sold
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>

	<AlertDialog.Root bind:open={deleteDialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete Listing</AlertDialog.Title>
				<AlertDialog.Description>
					Are you sure you want to delete this listing? This action cannot be undone.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action
					class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					onclick={() => deleteListing()}
				>
					Delete
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
{/if}
