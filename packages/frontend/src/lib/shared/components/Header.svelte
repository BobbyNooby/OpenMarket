<script lang="ts">
	import { authClient } from '$lib/api/client.js';
	import Button from './Button.svelte';

	interface Props {
		session: {
			user: {
				id: string;
				name: string;
				email: string;
				image?: string | null;
			};
		} | null;
	}

	let { session }: Props = $props();

	let dropdownOpen = $state(false);

	// Get username from session user name (Discord username is stored in name field)
	const username = $derived(session?.user?.name ?? '');
	const userImage = $derived(session?.user?.image);

	async function signInWithDiscord() {
		await authClient.signIn.social({
			provider: 'discord'
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

<header
	class="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
>
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
		<!-- Left: Logo and Navigation -->
		<div class="flex items-center gap-8">
			<!-- Logo -->
			<a href="/" class="text-2xl font-bold text-[var(--color-primary)]">OpenMarket</a>

			<!-- Navigation Links -->
			<nav class="flex items-center gap-6">
				<a
					href="/"
					class="font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
				>
					Home
				</a>
				<a
					href="/listings"
					class="font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
				>
					Listings
				</a>
				<a
					href="/items"
					class="font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
				>
					Items
				</a>
			</nav>
		</div>

		<!-- Right: User Section -->
		<div class="flex items-center gap-4">
			{#if session}
				<!-- Avatar Dropdown -->
				<div class="relative">
					<button
						onclick={(e) => {
							e.stopPropagation();
							toggleDropdown();
						}}
						class="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-[var(--color-background)]"
					>
						{#if userImage}
							<img
								src={userImage}
								alt={username}
								class="h-10 w-10 rounded-full border-2 border-[var(--color-border)] object-cover"
							/>
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-primary)] text-lg font-bold text-white"
							>
								{username.charAt(0).toUpperCase()}
							</div>
						{/if}
						<svg
							class="h-4 w-4 text-[var(--color-textSecondary)] transition-transform {dropdownOpen
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

					<!-- Dropdown Menu -->
					{#if dropdownOpen}
						<div
							class="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
						>
							<div class="border-b border-[var(--color-border)] px-4 py-3">
								<p class="truncate font-medium text-[var(--color-text)]">{username}</p>
								<p class="truncate text-sm text-[var(--color-textSecondary)]">
									{session.user.email}
								</p>
							</div>
							<div class="py-1">
								<a
									href="/profile/{username}"
									class="block px-4 py-2 text-[var(--color-text)] transition-colors hover:bg-[var(--color-background)]"
								>
									View Profile
								</a>
								<button
									onclick={signOut}
									class="block w-full px-4 py-2 text-left text-[var(--color-danger)] transition-colors hover:bg-[var(--color-background)]"
								>
									Sign Out
								</button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Sign In Button -->
				<Button variant="primary" onclick={signInWithDiscord}>Sign In with Discord</Button>
			{/if}
		</div>
	</div>
</header>
