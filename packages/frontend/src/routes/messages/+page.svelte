<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { wsManager } from '$lib/stores/ws.svelte';
	import ConversationList from './ConversationList.svelte';
	import MessageThread from './MessageThread.svelte';
	import MessageInput from './MessageInput.svelte';
	import EmptyState from './EmptyState.svelte';

	interface Participant {
		user_id: string;
		username: string;
		display_name: string;
		avatar: string | null;
	}

	interface LastMessage {
		id: string;
		content: string;
		sender_id: string;
		created_at: string;
	}

	interface Conversation {
		id: string;
		created_at: string;
		updated_at: string;
		listing_id: string | null;
		other_participant: Participant | null;
		last_message: LastMessage | null;
		unread_count: number;
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

	let { data } = $props();

	let conversations = $state<Conversation[]>(data.conversations as Conversation[]);
	let activeConversationId = $state<string | null>(data.openConversationId);
	let messages = $state<Message[]>([]);
	let loading = $state(false);
	let hasMore = $state(false);
	let nextCursor = $state<string | null>(null);
	let showSidebar = $state(true);

	const activeConversation = $derived(
		conversations.find((c) => c.id === activeConversationId) ?? null
	);

	const currentUserId = $derived(data.session?.user?.id ?? '');

	let unsubscribers: (() => void)[] = [];

	onMount(() => {
		// Subscribe to real-time events
		unsubscribers.push(
			wsManager.on('new_message', (raw) => {
				const msg = raw as Message;
				// If this is the active conversation, append message
				if (msg.conversation_id === activeConversationId) {
					messages = [...messages, msg];
					// Mark as read
					markAsRead(msg.conversation_id);
				} else {
					// Increment unread for this conversation
					conversations = conversations.map((c) =>
						c.id === msg.conversation_id
							? { ...c, unread_count: c.unread_count + 1 }
							: c
					);
					// totalUnread is bumped automatically by wsManager
				}

				// Update last message preview and reorder
				conversations = conversations
					.map((c) =>
						c.id === msg.conversation_id
							? {
									...c,
									last_message: {
										id: msg.id,
										content: msg.content ?? '',
										sender_id: msg.sender_id,
										created_at: msg.created_at
									},
									updated_at: msg.created_at
								}
							: c
					)
					.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
			})
		);

		unsubscribers.push(
			wsManager.on('message_deleted', (raw) => {
				const data = raw as { message_id: string; conversation_id: string };
				messages = messages.map((m) =>
					m.id === data.message_id ? { ...m, is_deleted: true, content: null } : m
				);
			})
		);

		// Auto-open conversation if deep-linked
		if (activeConversationId) {
			wsManager.activeConversationId = activeConversationId;
			loadMessages(activeConversationId);
			showSidebar = false;
		}
	});

	onDestroy(() => {
		for (const unsub of unsubscribers) unsub();
		wsManager.activeConversationId = null;
	});

	async function loadMessages(conversationId: string) {
		loading = true;
		messages = [];
		hasMore = false;
		nextCursor = null;

		try {
			const res = await fetch(
				`${PUBLIC_API_URL}/api/conversations/${conversationId}/messages`,
				{ credentials: 'include' }
			);
			const json = await res.json();
			if (json.success) {
				messages = (json.data as Message[]).reverse();
				hasMore = json.has_more;
				nextCursor = json.next_cursor;
			}
		} catch {
			// error loading messages
		} finally {
			loading = false;
		}

		// Reset unread count for this conversation
		conversations = conversations.map((c) =>
			c.id === conversationId ? { ...c, unread_count: 0 } : c
		);
		recalcTotalUnread();
	}

	async function loadOlderMessages() {
		if (!activeConversationId || !hasMore || !nextCursor || loading) return;
		loading = true;

		try {
			const res = await fetch(
				`${PUBLIC_API_URL}/api/conversations/${activeConversationId}/messages?before=${nextCursor}`,
				{ credentials: 'include' }
			);
			const json = await res.json();
			if (json.success) {
				const older = (json.data as Message[]).reverse();
				messages = [...older, ...messages];
				hasMore = json.has_more;
				nextCursor = json.next_cursor;
			}
		} catch {
			// error
		} finally {
			loading = false;
		}
	}

	async function markAsRead(conversationId: string) {
		// The GET messages endpoint already marks as read, but we call it to ensure
		await fetch(
			`${PUBLIC_API_URL}/api/conversations/${conversationId}/messages?limit=1`,
			{ credentials: 'include' }
		);
	}

	function recalcTotalUnread() {
		const total = conversations.reduce((sum, c) => sum + c.unread_count, 0);
		wsManager.updateUnreadCount(total);
	}

	function selectConversation(id: string) {
		activeConversationId = id;
		wsManager.activeConversationId = id;
		showSidebar = false;
		loadMessages(id);
	}

	function backToList() {
		showSidebar = true;
		activeConversationId = null;
		wsManager.activeConversationId = null;
	}

	async function startNewConversation(targetUserId: string) {
		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/conversations`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ target_user_id: targetUserId })
			});
			const json = await res.json();
			if (json.success) {
				// If it's a new conversation, reload the list
				if (!json.existing) {
					const listRes = await fetch(`${PUBLIC_API_URL}/api/conversations`, {
						credentials: 'include'
					});
					const listJson = await listRes.json();
					if (listJson.success) conversations = listJson.data;
				}
				selectConversation(json.data.id);
			}
		} catch {
			// error
		}
	}

	async function handleSend(content: string) {
		if (!activeConversationId || !content.trim()) return;

		const tempId = `temp-${Date.now()}`;
		const optimisticMsg: Message = {
			id: tempId,
			conversation_id: activeConversationId,
			sender_id: currentUserId,
			content: content.trim(),
			created_at: new Date().toISOString(),
			edited_at: null,
			is_deleted: false,
			sender: {
				user_id: currentUserId,
				username: data.session?.user?.name ?? '',
				display_name: data.session?.user?.name ?? '',
				avatar: data.session?.user?.image ?? null
			}
		};

		// Optimistic append
		messages = [...messages, optimisticMsg];

		// Update conversation preview
		conversations = conversations
			.map((c) =>
				c.id === activeConversationId
					? {
							...c,
							last_message: {
								id: tempId,
								content: content.trim(),
								sender_id: currentUserId,
								created_at: optimisticMsg.created_at
							},
							updated_at: optimisticMsg.created_at
						}
					: c
			)
			.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

		try {
			const res = await fetch(
				`${PUBLIC_API_URL}/api/conversations/${activeConversationId}/messages`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content: content.trim() })
				}
			);
			const json = await res.json();
			if (json.success) {
				// Replace temp ID with real ID
				messages = messages.map((m) =>
					m.id === tempId ? { ...m, id: json.data.id, created_at: json.data.created_at } : m
				);
			}
		} catch {
			// Mark as failed
			messages = messages.filter((m) => m.id !== tempId);
		}
	}
</script>

<svelte:head>
	<title>Messages | {data.siteConfig?.site_name ?? 'OpenMarket'}</title>
</svelte:head>

<div class="flex h-[calc(100vh-4rem)] bg-background">
	<!-- Conversation List Sidebar -->
	<div
		class="w-full flex-shrink-0 border-r border-border bg-muted/30 md:block md:w-80"
		class:hidden={!showSidebar}
		class:block={showSidebar}
	>
		<ConversationList
			{conversations}
			activeId={activeConversationId}
			{currentUserId}
			onSelect={selectConversation}
			onNewConversation={startNewConversation}
		/>
	</div>

	<!-- Message Thread -->
	<div
		class="flex min-w-0 flex-1 flex-col md:flex"
		class:hidden={showSidebar}
		class:flex={!showSidebar}
	>
		{#if activeConversation}
			<MessageThread
				{messages}
				{currentUserId}
				otherUser={activeConversation.other_participant}
				{loading}
				{hasMore}
				onLoadMore={loadOlderMessages}
				onBack={backToList}
				typingUsers={wsManager.typingUsers.get(activeConversation.id)}
			/>
			<MessageInput
				conversationId={activeConversation.id}
				onSend={handleSend}
				disabled={!activeConversation}
			/>
		{:else}
			<EmptyState />
		{/if}
	</div>
</div>
