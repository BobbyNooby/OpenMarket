<script lang="ts">
	import { authClient } from '$lib/api/client.js';
	import { Button } from '$lib/components/ui/button';
	import { createPermissionChecker } from '$lib/utils/permissions';

	interface Props {
		session: {
			user: {
				id: string;
				name: string;
				email: string;
				image?: string | null;
			} | null;
			permissions: string[];
			roles: string[];
		} | null;
	}

	let { session }: Props = $props();

	let dropdownOpen = $state(false);

	const username = $derived(session?.user?.name ?? '');
	const userImage = $derived(session?.user?.image);
	const perms = $derived(createPermissionChecker(session));

	const leftLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/listings', label: 'Listings' },
		{ href: '/items', label: 'Items' }
	];

	const rightLinks = $derived(
		perms.canAccessAdmin || perms.canManageItems
			? [{ href: '/admin', label: 'Admin' }]
			: []
	);

	async function signInWithDiscord() {
		await authClient.signIn.social({
			provider: 'discord',
			callbackURL: 'http://localhost:5173'
		});
	}

	async function signOut() {
		await authClient.signOut();
		window.location.href = '/';
	}

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}
</script>

<svelte:window onclick={closeDropdown} />

<header class="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
		<!-- Left: Logo and Navigation -->
		<div class="flex items-center gap-8">
			<a href="/" class="text-2xl font-bold text-primary">OpenMarket</a>

			<nav class="flex items-center gap-6">
				{#each leftLinks as { href, label }}
					<a
						{href}
						class="font-medium text-foreground transition-colors hover:text-primary"
					>
						{label}
					</a>
				{/each}
			</nav>
		</div>

		<!-- Right: Navigation and User Section -->
		<div class="flex items-center gap-6">
			{#each rightLinks as { href, label }}
				<a
					{href}
					class="font-medium text-foreground transition-colors hover:text-primary"
				>
					{label}
				</a>
			{/each}
			{#if session}
				<div class="relative">
					<button
						onclick={(e) => {
							e.stopPropagation();
							toggleDropdown();
						}}
						class="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-background"
					>
						{#if userImage}
							<img
								src={userImage}
								alt={username}
								class="h-10 w-10 rounded-full border-2 border-border object-cover"
							/>
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-primary text-lg font-bold text-primary-foreground"
							>
								{username.charAt(0).toUpperCase()}
							</div>
						{/if}
						<svg
							class="h-4 w-4 text-muted-foreground transition-transform {dropdownOpen
								? 'rotate-180'
								: ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					{#if dropdownOpen}
						<div
							class="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
						>
							<div class="border-b border-border px-4 py-3">
								<p class="truncate font-medium text-foreground">
									{username}
								</p>
								<p class="truncate text-sm text-muted-foreground">
									{session.user?.email}
								</p>
							</div>
							<div class="py-1">
								<a
									href="/profile/{username}"
									class="block px-4 py-2 text-foreground transition-colors hover:bg-background"
								>
									View Profile
								</a>
								<button
									onclick={signOut}
									class="block w-full px-4 py-2 text-left text-destructive transition-colors hover:bg-background"
								>
									Sign Out
								</button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<Button onclick={signInWithDiscord}>Sign In with Discord</Button>
			{/if}
		</div>
	</div>
</header>
