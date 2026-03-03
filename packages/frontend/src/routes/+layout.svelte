<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { toggleTheme, themeMode, initTheme } from '$lib/design/theme';
	import { Header } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Toaster from '$lib/components/ui/sonner/sonner.svelte';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		initTheme();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Tooltip.Provider delayDuration={0}>
	<div class="relative min-h-screen bg-background">
		<Header session={data.session} />

		<div class="fixed right-4 top-4 z-50">
			<Button variant="outline" size="sm" onclick={() => toggleTheme()}>
				{$themeMode === 'dark' ? '☀️' : '🌙'}
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
