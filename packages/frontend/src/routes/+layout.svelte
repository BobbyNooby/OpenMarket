<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { toggleTheme, themeMode, initTheme } from '$lib/design/theme';
	import { Header } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Toaster from '$lib/components/ui/sonner/sonner.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { chatManager } from '$lib/stores/chat.svelte';
	import { notificationManager } from '$lib/stores/notifications.svelte';
	import { track } from '$lib/utils/analytics';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';

	let { children, data } = $props();

	// Auth pages (login, onboarding) render as full-screen standalone layouts
	const isAuthPage = $derived(
		page.url.pathname.startsWith('/login') || page.url.pathname.startsWith('/onboarding'),
	);

	onMount(() => {
		initTheme();
		track('page_view');

		// Connect WebSocket for real-time messaging (logged-in users only)
		if (data.session?.user) {
			chatManager.updateUnreadCount(data.unreadMessageCount ?? 0);
			chatManager.connect();
			notificationManager.fetch();
		}
	});

	afterNavigate(() => {
		track('page_view');
	});

	onDestroy(() => {
		chatManager.disconnect();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Tooltip.Provider delayDuration={0}>
	<div class="relative min-h-screen bg-background">
		{#if !isAuthPage}
			<Header session={data.session} />
		{/if}

		<div class="fixed right-4 top-4 z-50">
			<Button variant="outline" size="sm" onclick={() => toggleTheme()}>
				{#if $themeMode === 'dark'}
					<Sun class="h-4 w-4" />
				{:else}
					<Moon class="h-4 w-4" />
				{/if}
			</Button>
		</div>

		{#if data.session?.ban}
			<div class="border-b border-destructive bg-destructive/10 px-8 py-3">
				<div class="mx-auto flex max-w-7xl items-start gap-3">
					<ShieldAlert class="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
					<div>
						<p class="font-semibold text-destructive">Your account has been banned</p>
						{#if data.session.ban.reason}
							<p class="text-sm text-destructive/80">Reason: {data.session.ban.reason}</p>
						{/if}
						{#if data.session.ban.expiresAt}
							<p class="text-sm text-destructive/80">
								Expires: {new Date(data.session.ban.expiresAt).toLocaleDateString('en-US', {
									year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
								})}
							</p>
						{:else}
							<p class="text-sm text-destructive/80">This ban is permanent.</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		{@render children?.()}
	</div>
	<Toaster richColors />
</Tooltip.Provider>
