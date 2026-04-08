<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ItemImage from '$lib/components/item/ItemImage.svelte';
	import ListingEmbed from '$lib/components/listing/ListingEmbed.svelte';

	// Build a regex that only matches our own app's listing URLs
	const APP_ORIGIN = (PUBLIC_APP_URL ?? '').replace(/\/$/, '');
	const LISTING_URL_RE = APP_ORIGIN
		? new RegExp(
				`${APP_ORIGIN.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}/listings/view/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`,
				'gi',
			)
		: /a^/;

	type MessageChunk =
		| { type: 'text'; value: string }
		| { type: 'embed'; listingId: string };

	function parseMessage(content: string): MessageChunk[] {
		if (!content) return [{ type: 'text', value: '' }];
		const chunks: MessageChunk[] = [];
		let lastIndex = 0;
		// Reset the regex state since it's stateful with /g
		LISTING_URL_RE.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = LISTING_URL_RE.exec(content)) !== null) {
			if (match.index > lastIndex) {
				chunks.push({ type: 'text', value: content.slice(lastIndex, match.index) });
			}
			chunks.push({ type: 'embed', listingId: match[1] });
			lastIndex = match.index + match[0].length;
		}
		if (lastIndex < content.length) {
			chunks.push({ type: 'text', value: content.slice(lastIndex) });
		}
		return chunks;
	}

	// True when the message is *only* a listing URL (with optional whitespace)
	function isPureEmbed(chunks: MessageChunk[]): boolean {
		const meaningful = chunks.filter(
			(c) => c.type === 'embed' || (c.type === 'text' && c.value.trim().length > 0),
		);
		return meaningful.length === 1 && meaningful[0].type === 'embed';
	}

	interface Participant {
		user_id: string;
		username: string;
		display_name: string;
		avatar: string | null;
	}

	interface ListingContext {
		id: string;
		amount: number;
		order_type: 'buy' | 'sell';
		status: 'active' | 'sold' | 'paused' | 'expired';
		requested_name: string;
		requested_image: string | null;
		requested_kind: 'item' | 'currency';
	}

	interface Message {
		id: string;
		conversation_id: string;
		sender_id: string;
		content: string | null;
		created_at: string;
		edited_at: string | null;
		is_deleted: boolean;
		sender: {
			user_id: string;
			username: string;
			display_name: string;
			avatar: string | null;
		};
	}

	interface Props {
		messages: Message[];
		currentUserId: string;
		otherUser: Participant | null;
		listingContext?: ListingContext | null;
		loading: boolean;
		hasMore: boolean;
		onLoadMore: () => void;
		onBack: () => void;
		typingUsers?: Set<string>;
	}

	let {
		messages,
		currentUserId,
		otherUser,
		listingContext = null,
		loading,
		hasMore,
		onLoadMore,
		onBack,
		typingUsers
	}: Props = $props();

	let scrollContainer: HTMLDivElement | null = $state(null);
	let sentinelRef: HTMLDivElement | null = $state(null);
	let wasNearBottom = $state(true);
	let prevMessageCount = $state(0);

	const isTyping = $derived(typingUsers && typingUsers.size > 0);

	function isNearBottom(): boolean {
		if (!scrollContainer) return true;
		const threshold = 100;
		return (
			scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight <
			threshold
		);
	}

	function scrollToBottom() {
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	// Scroll to bottom when new messages arrive (if near bottom)
	$effect(() => {
		const count = messages.length;
		if (count > prevMessageCount) {
			if (wasNearBottom) {
				tick().then(scrollToBottom);
			}
			prevMessageCount = count;
		}
	});

	// Initial scroll to bottom
	onMount(() => {
		tick().then(scrollToBottom);
	});

	// Intersection observer for infinite scroll upward
	$effect(() => {
		if (!sentinelRef) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					onLoadMore();
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(sentinelRef);
		return () => observer.disconnect();
	});

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) return 'Today';
		if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function shouldShowDateSeparator(index: number): boolean {
		if (index === 0) return true;
		const prev = new Date(messages[index - 1].created_at).toDateString();
		const curr = new Date(messages[index].created_at).toDateString();
		return prev !== curr;
	}

	function shouldShowAvatar(index: number): boolean {
		if (index === messages.length - 1) return true;
		return messages[index].sender_id !== messages[index + 1].sender_id;
	}
</script>

<div class="flex flex-1 flex-col overflow-hidden">
	<!-- Thread Header -->
	<div class="flex items-center gap-3 border-b border-border px-4 py-3">
		<Button variant="ghost" size="icon" class="md:hidden" onclick={onBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<a href="/profile/{otherUser?.username ?? ''}" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
			<Avatar.Root class="h-8 w-8">
				{#if otherUser?.avatar}
					<Avatar.Image src={otherUser.avatar} alt={otherUser.display_name} />
				{/if}
				<Avatar.Fallback class="bg-primary text-xs font-bold text-primary-foreground">
					{(otherUser?.display_name ?? '?').charAt(0).toUpperCase()}
				</Avatar.Fallback>
			</Avatar.Root>
			<div>
				<p class="text-sm font-semibold">{otherUser?.display_name ?? 'Unknown'}</p>
				<p class="text-xs text-muted-foreground">@{otherUser?.username ?? 'unknown'}</p>
			</div>
		</a>
	</div>

	<!-- Pinned listing context (when conversation is linked to a listing) -->
	{#if listingContext}
		<div class="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
			<ItemImage
				src={listingContext.requested_image ?? ''}
				alt={listingContext.requested_name}
				size="sm"
			/>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<p class="truncate text-sm font-semibold">
						{listingContext.amount}× {listingContext.requested_name}
					</p>
					{#if listingContext.order_type === 'buy'}
						<Badge class="bg-green-500 text-white hover:bg-green-500">Buy</Badge>
					{:else}
						<Badge class="bg-amber-500 text-white hover:bg-amber-500">Sell</Badge>
					{/if}
					{#if listingContext.status !== 'active'}
						<Badge variant="secondary" class="capitalize">{listingContext.status}</Badge>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">Conversation about this listing</p>
			</div>
			<Button variant="outline" size="sm" href="/listings/view/{listingContext.id}">
				View
			</Button>
		</div>
	{/if}

	<!-- Messages -->
	<div
		class="flex-1 overflow-y-auto px-4 py-2"
		bind:this={scrollContainer}
		onscroll={() => (wasNearBottom = isNearBottom())}
	>
		<!-- Load more sentinel -->
		{#if hasMore}
			<div bind:this={sentinelRef} class="flex justify-center py-2">
				{#if loading}
					<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
				{/if}
			</div>
		{/if}

		{#each messages as msg, i (msg.id)}
			<!-- Date separator -->
			{#if shouldShowDateSeparator(i)}
				<div class="my-4 flex items-center gap-3">
					<div class="h-px flex-1 bg-border"></div>
					<span class="text-xs font-medium text-muted-foreground">
						{formatDate(msg.created_at)}
					</span>
					<div class="h-px flex-1 bg-border"></div>
				</div>
			{/if}

			<!-- Message -->
			{@const isOwn = msg.sender_id === currentUserId}
			{@const showAvatar = shouldShowAvatar(i)}
			<div class="mb-1 flex {isOwn ? 'justify-end' : 'justify-start'}">
				<div class="flex max-w-[75%] items-end gap-2 {isOwn ? 'flex-row-reverse' : ''}">
					<!-- Avatar (shown for last message in a group) -->
					{#if !isOwn && showAvatar}
						<Avatar.Root class="h-7 w-7 flex-shrink-0">
							{#if msg.sender.avatar}
								<Avatar.Image src={msg.sender.avatar} alt={msg.sender.display_name} />
							{/if}
							<Avatar.Fallback class="bg-muted text-xs">
								{msg.sender.display_name.charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>
					{:else if !isOwn}
						<div class="w-7 flex-shrink-0"></div>
					{/if}

					<!-- Bubble -->
					<div>
						{#if msg.is_deleted}
							<div
								class="rounded-2xl px-3 py-2 text-sm {isOwn
									? 'rounded-br-md bg-primary text-primary-foreground'
									: 'rounded-bl-md bg-muted text-foreground'}"
							>
								<span class="italic text-muted-foreground/70">Message deleted</span>
							</div>
						{:else}
							{@const chunks = parseMessage(msg.content ?? '')}
							{#if isPureEmbed(chunks)}
								<!-- Drop the bubble wrapper for pure-embed messages -->
								{#each chunks as chunk}
									{#if chunk.type === 'embed'}
										<ListingEmbed listingId={chunk.listingId} />
									{/if}
								{/each}
							{:else}
								<div
									class="rounded-2xl px-3 py-2 text-sm {isOwn
										? 'rounded-br-md bg-primary text-primary-foreground'
										: 'rounded-bl-md bg-muted text-foreground'}"
								>
									{#each chunks as chunk}
										{#if chunk.type === 'text'}
											<span class="whitespace-pre-wrap break-words">{chunk.value}</span>
										{:else}
											<div class="my-1">
												<ListingEmbed listingId={chunk.listingId} />
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						{/if}
						{#if showAvatar}
							<p
								class="mt-0.5 text-[10px] text-muted-foreground {isOwn ? 'text-right' : 'text-left'}"
							>
								{formatTime(msg.created_at)}
							</p>
						{/if}
					</div>
				</div>
			</div>
		{/each}

		<!-- Typing indicator -->
		{#if isTyping}
			<div class="mb-1 flex items-center gap-2 py-1">
				<div class="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2">
					<span class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]"></span>
					<span class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]"></span>
					<span class="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]"></span>
				</div>
				<span class="text-xs text-muted-foreground">
					{otherUser?.display_name ?? 'Someone'} is typing...
				</span>
			</div>
		{/if}
	</div>
</div>
