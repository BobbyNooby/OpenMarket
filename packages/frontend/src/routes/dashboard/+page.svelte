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
	import Repeat from '@lucide/svelte/icons/repeat';
	import ThumbsUp from '@lucide/svelte/icons/thumbs-up';
	import ThumbsDown from '@lucide/svelte/icons/thumbs-down';
	import PlusCircle from '@lucide/svelte/icons/plus-circle';
	import User from '@lucide/svelte/icons/user';
	import Mail from '@lucide/svelte/icons/mail';
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

	// Profile + reviews
	const profile = $derived((data as any).profile);
	const reviews = $derived(profile?.reviews ?? []);
	const upvotes = $derived(reviews.filter((r: any) => r.type === 'upvote').length);
	const downvotes = $derived(reviews.filter((r: any) => r.type === 'downvote').length);
	const recentReviews = $derived(reviews.slice(0, 3));
	const username = $derived(profile?.username ?? data.session?.user?.name ?? '');

	// Recent conversations (top 5)
	const recentConversations = $derived(((data as any).conversations ?? []).slice(0, 5));

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(dateStr).toLocaleDateString();
	}

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
			<h1 class="text-3xl font-bold">Dashboard</h1>
		</div>

		<!-- Quick Actions -->
		<div class="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
			<Button href="/listings/new" size="lg" class="justify-start">
				<PlusCircle class="mr-2 h-5 w-5" />
				Create New Listing
			</Button>
			<Button href="/profile/{username}" variant="outline" size="lg" class="justify-start">
				<User class="mr-2 h-5 w-5" />
				View My Profile
			</Button>
			<Button href="/messages" variant="outline" size="lg" class="justify-start">
				<Mail class="mr-2 h-5 w-5" />
				Open Messages
			</Button>
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

		<!-- Reviews + Recent Messages -->
		<div class="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ThumbsUp class="h-5 w-5" />
						My Reviews
					</Card.Title>
					<Card.Description>
						{upvotes + downvotes} total reviews received
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="mb-4 flex items-center gap-6">
						<div class="flex items-center gap-2">
							<ThumbsUp class="h-5 w-5 text-green-500" />
							<span class="text-2xl font-bold text-green-500">{upvotes}</span>
						</div>
						<div class="flex items-center gap-2">
							<ThumbsDown class="h-5 w-5 text-destructive" />
							<span class="text-2xl font-bold text-destructive">{downvotes}</span>
						</div>
						<div class="text-sm text-muted-foreground">
							Net: <span class="font-semibold text-foreground">{upvotes - downvotes}</span>
						</div>
					</div>
					{#if recentReviews.length === 0}
						<p class="py-2 text-sm text-muted-foreground">No reviews yet.</p>
					{:else}
						<div class="space-y-2">
							{#each recentReviews as review}
								<div class="rounded-md border border-border p-2 text-sm">
									<div class="mb-1 flex items-center gap-2">
										{#if review.type === 'upvote'}
											<ThumbsUp class="h-3 w-3 text-green-500" />
										{:else}
											<ThumbsDown class="h-3 w-3 text-destructive" />
										{/if}
										<a href="/profile/{review.voter?.username}" class="font-medium hover:text-primary hover:underline">
											@{review.voter?.username ?? 'unknown'}
										</a>
										<span class="ml-auto text-xs text-muted-foreground">{timeAgo(review.created_at)}</span>
									</div>
									{#if review.comment}
										<p class="text-muted-foreground">{review.comment}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<MessageSquare class="h-5 w-5" />
						Recent Messages
					</Card.Title>
					<Card.Description>Your 5 most recent conversations</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if recentConversations.length === 0}
						<p class="py-2 text-sm text-muted-foreground">No conversations yet.</p>
					{:else}
						<div class="space-y-2">
							{#each recentConversations as conv}
								<a
									href="/messages?conv={conv.id}"
									class="flex items-center gap-3 rounded-md border border-border p-2 transition-colors hover:bg-card"
								>
									{#if conv.other_participant?.avatar}
										<img src={conv.other_participant.avatar} alt="" class="h-8 w-8 rounded-full" />
									{:else}
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
											{(conv.other_participant?.display_name ?? '?').charAt(0).toUpperCase()}
										</div>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">@{conv.other_participant?.username ?? 'unknown'}</p>
										<p class="truncate text-xs text-muted-foreground">
											{conv.last_message?.content ?? 'No messages yet'}
										</p>
									</div>
									{#if conv.unread_count > 0}
										<Badge variant="default">{conv.unread_count}</Badge>
									{/if}
								</a>
							{/each}
						</div>
					{/if}
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

		<!-- Trade History -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Repeat class="h-5 w-5" />
					Trade History ({(data.trades ?? []).length})
				</Card.Title>
				<Card.Description>Completed trades as buyer or seller</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if (data.trades ?? []).length === 0}
					<p class="py-8 text-center text-muted-foreground">No completed trades yet.</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Item</Table.Head>
								<Table.Head>Role</Table.Head>
								<Table.Head>Other Party</Table.Head>
								<Table.Head class="text-right">Amount</Table.Head>
								<Table.Head>Date</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.trades as trade}
								{@const snapshot = typeof trade.listing_snapshot === 'string' ? JSON.parse(trade.listing_snapshot) : trade.listing_snapshot}
								{@const otherParty = trade.role === 'seller' ? trade.buyer : trade.seller}
								<Table.Row>
									<Table.Cell class="font-medium">
										{snapshot?.requested_item_name ?? snapshot?.requested_currency_name ?? 'Unknown'}
									</Table.Cell>
									<Table.Cell>
										<Badge variant={trade.role === 'seller' ? 'default' : 'secondary'}>
											{trade.role}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										{#if otherParty}
											<a href="/profile/{otherParty.username}" class="flex items-center gap-2 hover:text-primary hover:underline">
												{#if otherParty.avatar}
													<img src={otherParty.avatar} alt="" class="h-5 w-5 rounded-full" />
												{/if}
												@{otherParty.username}
											</a>
										{:else}
											<span class="text-muted-foreground">—</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-right">{snapshot?.amount ?? '—'}</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{new Date(trade.completed_at).toLocaleDateString()}
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
