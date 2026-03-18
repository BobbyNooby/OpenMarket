<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import NewConversationDialog from './NewConversationDialog.svelte';

	interface Participant {
		user_id: string;
		username: string;
		display_name: string;
		avatar: string | null;
	}

	interface Conversation {
		id: string;
		updated_at: string;
		other_participant: Participant | null;
		last_message: {
			id: string;
			content: string;
			sender_id: string;
			created_at: string;
		} | null;
		unread_count: number;
	}

	interface Props {
		conversations: Conversation[];
		activeId: string | null;
		currentUserId: string;
		onSelect: (id: string) => void;
		onNewConversation: (userId: string) => void;
	}

	let { conversations, activeId, currentUserId, onSelect, onNewConversation }: Props = $props();

	function timeAgo(dateString: string): string {
		const now = Date.now();
		const then = new Date(dateString).getTime();
		const diff = Math.floor((now - then) / 1000);
		if (diff < 60) return 'now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
		return new Date(dateString).toLocaleDateString();
	}

	function truncate(str: string, len: number): string {
		return str.length > len ? str.slice(0, len) + '...' : str;
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border px-4 py-3">
		<div class="flex items-center gap-2">
			<MessageSquare class="h-5 w-5 text-muted-foreground" />
			<h2 class="text-lg font-semibold">Messages</h2>
		</div>
		<NewConversationDialog onSelect={onNewConversation} />
	</div>

	<!-- Conversation List -->
	<div class="flex-1 overflow-y-auto">
		{#if conversations.length === 0}
			<div class="px-4 py-8 text-center text-sm text-muted-foreground">
				No conversations yet
			</div>
		{:else}
			{#each conversations as conv (conv.id)}
				<button
					class="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-accent/50 {conv.id === activeId ? 'bg-accent' : ''}"
					onclick={() => onSelect(conv.id)}
				>
					<Avatar.Root class="h-10 w-10 flex-shrink-0">
						{#if conv.other_participant?.avatar}
							<Avatar.Image
								src={conv.other_participant.avatar}
								alt={conv.other_participant.display_name}
							/>
						{/if}
						<Avatar.Fallback class="bg-primary text-sm font-bold text-primary-foreground">
							{(conv.other_participant?.display_name ?? '?').charAt(0).toUpperCase()}
						</Avatar.Fallback>
					</Avatar.Root>

					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between">
							<span class="truncate text-sm font-medium">
								{conv.other_participant?.display_name ?? 'Unknown'}
							</span>
							{#if conv.last_message}
								<span class="flex-shrink-0 text-xs text-muted-foreground">
									{timeAgo(conv.last_message.created_at)}
								</span>
							{/if}
						</div>
						<div class="flex items-center justify-between">
							<span class="truncate text-xs text-muted-foreground">
								{#if conv.last_message}
									{#if conv.last_message.sender_id === currentUserId}
										<span class="text-muted-foreground/70">You: </span>
									{/if}
									{truncate(conv.last_message.content, 40)}
								{:else}
									<span class="italic">No messages yet</span>
								{/if}
							</span>
							{#if conv.unread_count > 0}
								<Badge
									variant="destructive"
									class="ml-2 h-5 min-w-5 flex-shrink-0 px-1.5 text-xs"
								>
									{conv.unread_count}
								</Badge>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>
</div>
