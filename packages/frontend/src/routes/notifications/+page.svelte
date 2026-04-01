<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { notificationManager, type Notification } from '$lib/stores/notifications.svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import Star from '@lucide/svelte/icons/star';
	import Clock from '@lucide/svelte/icons/clock';
	import Shield from '@lucide/svelte/icons/shield';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import CheckCheck from '@lucide/svelte/icons/check-check';

	let notifications = $state<Notification[]>([]);
	let loading = $state(true);
	let hasMore = $state(true);
	let offset = $state(0);
	let sentinelRef = $state<HTMLDivElement | null>(null);

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

	async function loadNotifications() {
		loading = true;
		try {
			const res = await fetch(
				`${PUBLIC_API_URL}/notifications?limit=20&offset=${offset}`,
				{ credentials: 'include' }
			);
			const json = await res.json();
			if (json.success) {
				notifications = [...notifications, ...json.data];
				hasMore = json.data.length === 20;
				offset += json.data.length;
			}
		} catch {
			// silently fail
		} finally {
			loading = false;
		}
	}

	async function handleClick(notification: Notification) {
		// Optimistic update
		const idx = notifications.findIndex((n) => n.id === notification.id);
		if (idx >= 0 && !notifications[idx].is_read) {
			notifications[idx] = { ...notifications[idx], is_read: true };
			notificationManager.unreadCount = Math.max(0, notificationManager.unreadCount - 1);
		}

		await fetch(`${PUBLIC_API_URL}/notifications/${notification.id}/read`, {
			method: 'PATCH',
			credentials: 'include'
		});

		if (notification.link) {
			goto(notification.link);
		}
	}

	async function markAllRead() {
		notifications = notifications.map((n) => ({ ...n, is_read: true }));
		notificationManager.unreadCount = 0;
		await fetch(`${PUBLIC_API_URL}/notifications/read-all`, {
			method: 'POST',
			credentials: 'include'
		});
	}

	onMount(() => {
		loadNotifications();

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					loadNotifications();
				}
			},
			{ rootMargin: '200px' }
		);

		if (sentinelRef) {
			observer.observe(sentinelRef);
		}

		return () => observer.disconnect();
	});
</script>

<div class="mx-auto max-w-3xl px-8 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Notifications</h1>
		{#if notificationManager.unreadCount > 0}
			<Button variant="outline" size="sm" onclick={markAllRead}>
				Mark all as read
			</Button>
		{/if}
	</div>

	{#if notifications.length === 0 && !loading}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-4 py-16">
				<Bell class="h-12 w-12 text-muted-foreground" />
				<p class="text-lg text-muted-foreground">No notifications yet</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-2">
			{#each notifications as notification}
				{@const Icon = iconMap[notification.type] || Bell}
				<button
					class="flex w-full items-start gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50 {notification.is_read
						? 'bg-card opacity-70'
						: 'bg-card'}"
					onclick={() => handleClick(notification)}
				>
					<div
						class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full {notification.is_read
							? 'bg-muted'
							: 'bg-primary/10'}"
					>
						<Icon
							class="h-5 w-5 {notification.is_read
								? 'text-muted-foreground'
								: 'text-primary'}"
						/>
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p
								class="text-sm {notification.is_read
									? 'font-normal'
									: 'font-semibold'}"
							>
								{notification.title}
							</p>
							{#if !notification.is_read}
								<Badge variant="default" class="h-5 px-1.5 text-[10px]">New</Badge>
							{/if}
						</div>
						{#if notification.body}
							<p class="mt-1 text-sm text-muted-foreground">{notification.body}</p>
						{/if}
						<p class="mt-1 text-xs text-muted-foreground">
							{timeAgo(notification.created_at)}
						</p>
					</div>
				</button>
			{/each}
		</div>

		<div bind:this={sentinelRef} class="h-4"></div>

		{#if loading}
			<p class="py-4 text-center text-sm text-muted-foreground">Loading...</p>
		{/if}
	{/if}
</div>
