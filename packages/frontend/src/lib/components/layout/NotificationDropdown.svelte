<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { notificationManager } from '$lib/stores/notifications.svelte';
	import { goto } from '$app/navigation';
	import Bell from '@lucide/svelte/icons/bell';
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import Star from '@lucide/svelte/icons/star';
	import Clock from '@lucide/svelte/icons/clock';
	import Shield from '@lucide/svelte/icons/shield';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import CheckCheck from '@lucide/svelte/icons/check-check';

	let open = $state(false);

	const iconMap: Record<string, typeof Bell> = {
		new_message: MessageSquareText,
		new_review: Star,
		listing_expired: Clock,
		listing_sold: CheckCheck,
		role_changed: Shield,
		warning_received: AlertTriangle,
		report_resolved: FileCheck,
	};

	function timeAgo(dateStr: string): string {
		const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	async function handleClick(notification: (typeof notificationManager.notifications)[0]) {
		await notificationManager.markAsRead(notification.id);
		open = false;
		if (notification.link) {
			goto(notification.link);
		}
	}

	function handleOpen(isOpen: boolean) {
		open = isOpen;
		if (isOpen) {
			notificationManager.fetch();
		}
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpen}>
	<Popover.Trigger>
		<button class="relative text-foreground transition-colors hover:text-primary">
			<Bell class="h-5 w-5" />
			{#if notificationManager.unreadCount > 0}
				<Badge
					variant="destructive"
					class="absolute -right-2.5 -top-2 h-4 min-w-4 px-1 text-[10px]"
				>
					{notificationManager.unreadCount > 99 ? '99+' : notificationManager.unreadCount}
				</Badge>
			{/if}
		</button>
	</Popover.Trigger>

	<Popover.Content align="end" class="w-80 p-0">
		<div class="flex items-center justify-between border-b border-border px-4 py-3">
			<h3 class="text-sm font-semibold">Notifications</h3>
			{#if notificationManager.unreadCount > 0}
				<Button
					variant="ghost"
					size="sm"
					class="h-auto px-2 py-1 text-xs"
					onclick={() => notificationManager.markAllAsRead()}
				>
					Mark all read
				</Button>
			{/if}
		</div>

		<div class="max-h-80 overflow-y-auto">
			{#if notificationManager.notifications.length === 0}
				<div class="px-4 py-8 text-center text-sm text-muted-foreground">
					No notifications yet
				</div>
			{:else}
				{#each notificationManager.notifications as notification}
					{@const Icon = iconMap[notification.type] || Bell}
					<button
						class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 {notification.is_read
							? 'opacity-60'
							: ''}"
						onclick={() => handleClick(notification)}
					>
						<div
							class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full {notification.is_read
								? 'bg-muted'
								: 'bg-primary/10'}"
						>
							<Icon
								class="h-4 w-4 {notification.is_read
									? 'text-muted-foreground'
									: 'text-primary'}"
							/>
						</div>
						<div class="min-w-0 flex-1">
							<p
								class="text-sm {notification.is_read
									? 'font-normal'
									: 'font-semibold'}"
							>
								{notification.title}
							</p>
							{#if notification.body}
								<p class="mt-0.5 truncate text-xs text-muted-foreground">
									{notification.body}
								</p>
							{/if}
							<p class="mt-1 text-xs text-muted-foreground">
								{timeAgo(notification.created_at)}
							</p>
						</div>
						{#if !notification.is_read}
							<div class="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"></div>
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<div class="border-t border-border px-4 py-2">
			<Button
				variant="ghost"
				size="sm"
				class="h-auto w-full px-2 py-1 text-xs"
				onclick={() => {
					open = false;
					goto('/notifications');
				}}
			>
				View all notifications
			</Button>
		</div>
	</Popover.Content>
</Popover.Root>
