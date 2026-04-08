<script lang="ts">
	import { page } from '$app/state';
	import User from '@lucide/svelte/icons/user';
	import Shield from '@lucide/svelte/icons/shield';
	import Bell from '@lucide/svelte/icons/bell';
	import Languages from '@lucide/svelte/icons/languages';
	import { m } from '$lib/paraglide/messages.js';

	let { children } = $props();

	const tabs = $derived([
		{ href: '/settings/profile', label: m.settings_tab_profile(), icon: User },
		{ href: '/settings/notifications', label: m.settings_tab_notifications(), icon: Bell },
		{ href: '/settings/language', label: m.settings_tab_language(), icon: Languages },
		{ href: '/settings/account', label: m.settings_tab_account(), icon: Shield },
	]);
</script>

<div class="min-h-screen bg-background">
	<div class="mx-auto max-w-4xl px-4 py-8">
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-foreground">{m.settings_title()}</h1>
			<p class="text-muted-foreground">{m.settings_subtitle()}</p>
		</div>

		<div class="flex gap-8">
			<!-- Sidebar -->
			<div class="w-48 shrink-0">
				<nav class="flex flex-col gap-1">
					{#each tabs as tab}
						<a
							href={tab.href}
							class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {page.url.pathname === tab.href
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						>
							<tab.icon class="h-4 w-4" />
							{tab.label}
						</a>
					{/each}
				</nav>
			</div>

			<!-- Content -->
			<div class="flex-1">
				{@render children()}
			</div>
		</div>
	</div>
</div>