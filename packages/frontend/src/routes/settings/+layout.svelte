<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import User from '@lucide/svelte/icons/user';
	import Shield from '@lucide/svelte/icons/shield';

	let { children, data } = $props();

	const tabs = [
		{ href: '/settings/profile', label: 'Profile', icon: User },
		{ href: '/settings/account', label: 'Account', icon: Shield },
	];
</script>

<div class="min-h-screen bg-background">
	<div class="mx-auto max-w-4xl px-4 py-8">
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-foreground">Settings</h1>
			<p class="text-muted-foreground">Manage your account and preferences</p>
		</div>

		<div class="flex gap-8">
			<!-- Sidebar -->
			<div class="w-48 shrink-0">
				<nav class="flex flex-col gap-1">
					{#each tabs as tab}
						<a
							href={tab.href}
							class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page.url.pathname === tab.href
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