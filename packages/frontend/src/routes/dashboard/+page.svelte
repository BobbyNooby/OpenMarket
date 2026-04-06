<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Eye from '@lucide/svelte/icons/eye';
	import Users from '@lucide/svelte/icons/users';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import { track } from '$lib/utils/analytics';
	import { onMount } from 'svelte';

	let { data } = $props();

	type SortKey = 'name' | 'status' | 'views' | 'unique' | 'messages' | 'created';
	let sortKey = $state<SortKey>('views');
	let sortAsc = $state(false);

	interface ListingRow {
		id: string;
		requested_item?: { name: string } | null;
		requested_currency?: { name: string } | null;
		status: string;
		order_type: string;
		created_at: string;
	}

	const listings = $derived(data.listings as ListingRow[]);
	const statsMap = $derived(data.statsMap as Record<string, { total_views: number; unique_sessions: number; unique_users: number; messages: number }>);

	function getStats(id: string) {
		return statsMap[id] || { total_views: 0, unique_sessions: 0, unique_users: 0, messages: 0 };
	}

	function getName(listing: ListingRow) {
		return listing.requested_item?.name || listing.requested_currency?.name || 'Unknown';
	}

	const sortedListings = $derived(() => {
		const sorted = [...listings];
		sorted.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'name': cmp = getName(a).localeCompare(getName(b)); break;
				case 'status': cmp = a.status.localeCompare(b.status); break;
				case 'views': cmp = getStats(a.id).total_views - getStats(b.id).total_views; break;
				case 'unique': cmp = getStats(a.id).unique_users - getStats(b.id).unique_users; break;
				case 'messages': cmp = getStats(a.id).messages - getStats(b.id).messages; break;
				case 'created': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
			}
			return sortAsc ? cmp : -cmp;
		});
		return sorted;
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = false;
		}
	}

	const totalViews = $derived(listings.reduce((sum: number, l: ListingRow) => sum + getStats(l.id).total_views, 0));
	const totalUniqueViewers = $derived(listings.reduce((sum: number, l: ListingRow) => sum + getStats(l.id).unique_users, 0));
	const totalMessages = $derived(listings.reduce((sum: number, l: ListingRow) => sum + getStats(l.id).messages, 0));
	const avgContactRate = $derived(() => {
		if (totalViews === 0) return '0%';
		return ((totalMessages / totalViews) * 100).toFixed(1) + '%';
	});

	function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'active': return 'default';
			case 'paused': return 'secondary';
			case 'expired': return 'destructive';
			default: return 'outline';
		}
	}

	onMount(() => {
		track('page_view');
	});
</script>

<div class="min-h-screen text-foreground">
	<div class="mx-auto max-w-7xl px-8 py-12">
		<div class="mb-8 flex items-center gap-3">
			<BarChart3 class="h-8 w-8 text-primary" />
			<h1 class="text-3xl font-bold">Seller Dashboard</h1>
		</div>

		<!-- Summary Cards -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium">Total Views</Card.Title>
					<Eye class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{totalViews.toLocaleString()}</div>
					<p class="text-xs text-muted-foreground">Across all listings</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium">Unique Viewers</Card.Title>
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{totalUniqueViewers.toLocaleString()}</div>
					<p class="text-xs text-muted-foreground">Distinct users</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium">Messages</Card.Title>
					<MessageSquare class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{totalMessages.toLocaleString()}</div>
					<p class="text-xs text-muted-foreground">Conversations started</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium">Contact Rate</Card.Title>
					<BarChart3 class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{avgContactRate()}</div>
					<p class="text-xs text-muted-foreground">Messages / views</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Listings Table -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Your Listings ({listings.length})</Card.Title>
				<Card.Description>Performance metrics for each of your listings</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if listings.length === 0}
					<p class="py-8 text-center text-muted-foreground">No listings yet. Create one to start tracking performance.</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>
									<Button variant="ghost" size="sm" onclick={() => toggleSort('name')}>
										Item <ArrowUpDown class="ml-1 h-3 w-3" />
									</Button>
								</Table.Head>
								<Table.Head>
									<Button variant="ghost" size="sm" onclick={() => toggleSort('status')}>
										Status <ArrowUpDown class="ml-1 h-3 w-3" />
									</Button>
								</Table.Head>
								<Table.Head class="text-right">
									<Button variant="ghost" size="sm" onclick={() => toggleSort('views')}>
										Views <ArrowUpDown class="ml-1 h-3 w-3" />
									</Button>
								</Table.Head>
								<Table.Head class="text-right">
									<Button variant="ghost" size="sm" onclick={() => toggleSort('unique')}>
										Unique <ArrowUpDown class="ml-1 h-3 w-3" />
									</Button>
								</Table.Head>
								<Table.Head class="text-right">
									<Button variant="ghost" size="sm" onclick={() => toggleSort('messages')}>
										Messages <ArrowUpDown class="ml-1 h-3 w-3" />
									</Button>
								</Table.Head>
								<Table.Head>
									<Button variant="ghost" size="sm" onclick={() => toggleSort('created')}>
										Created <ArrowUpDown class="ml-1 h-3 w-3" />
									</Button>
								</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each sortedListings() as listing}
								{@const stats = getStats(listing.id)}
								<Table.Row>
									<Table.Cell class="font-medium">
										<a href="/listings/{listing.id}" class="hover:text-primary hover:underline">
											{getName(listing)}
										</a>
										<span class="ml-2 text-xs text-muted-foreground">
											{listing.order_type}
										</span>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={statusVariant(listing.status)}>{listing.status}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">{stats.total_views}</Table.Cell>
									<Table.Cell class="text-right">{stats.unique_users}</Table.Cell>
									<Table.Cell class="text-right">{stats.messages}</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{new Date(listing.created_at).toLocaleDateString()}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
