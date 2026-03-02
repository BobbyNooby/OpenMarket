<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/api/client.js';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
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
</script>

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
				<DropdownMenu.Root bind:open={dropdownOpen}>
					<DropdownMenu.Trigger
						class="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-background"
					>
						<Avatar.Root class="size-10 border-2 border-border">
							{#if userImage}
								<Avatar.Image src={userImage} alt={username} />
							{/if}
							<Avatar.Fallback class="bg-primary text-lg font-bold text-primary-foreground">
								{username.charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>
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
					</DropdownMenu.Trigger>

					<DropdownMenu.Content align="end" class="w-48">
						<DropdownMenu.Label>
							<p class="font-medium">{username}</p>
							<p class="text-xs font-normal text-muted-foreground">
								{session.user?.email}
							</p>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => goto(`/profile/${username}`)}>
							View Profile
						</DropdownMenu.Item>
						<DropdownMenu.Item variant="destructive" onclick={signOut}>
							Sign Out
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<Button onclick={signInWithDiscord}>Sign In with Discord</Button>
			{/if}
		</div>
	</div>
</header>
