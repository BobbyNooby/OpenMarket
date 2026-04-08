<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/api/client';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { createPermissionChecker, type Session } from '$lib/utils/permissions';
	import { chatManager } from '$lib/stores/chat.svelte';
	import NotificationDropdown from './NotificationDropdown.svelte';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Languages from '@lucide/svelte/icons/languages';
	import { m } from '$lib/paraglide/messages.js';
	import { setLocale } from '$lib/paraglide/runtime.js';
	import { PUBLIC_API_URL } from '$env/static/public';

	interface Props {
		session: Session;
		siteName?: string;
	}

	let { session, siteName = 'OpenMarket' }: Props = $props();

	let dropdownOpen = $state(false);

	const username = $derived(session?.user?.name ?? '');
	const userImage = $derived(session?.user?.image);
	const perms = $derived(createPermissionChecker(session));

	const leftLinks = $derived([
		{ href: '/', label: m.nav_home() },
		{ href: '/listings', label: m.nav_listings() },
		{ href: '/items', label: m.nav_items() }
	]);

	const rightLinks = $derived(
		perms.canAccessAdmin || perms.canManageItems
			? [{ href: '/admin', label: m.nav_admin() }]
			: []
	);

	async function signOut() {
		await authClient.signOut();
		window.location.href = '/';
	}

	async function changeLanguage(locale: 'en' | 'es') {
		// Sync to backend if logged in (cross-device persistence)
		if (session?.user) {
			try {
				await fetch(`${PUBLIC_API_URL}/users/language`, {
					method: 'PUT',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ language: locale }),
				});
			} catch {
				// fall through to client-side switch anyway
			}
		}
		// setLocale writes the cookie + reloads so SSR picks up the new locale
		setLocale(locale);
	}
</script>

<header class="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
		<!-- Left: Logo and Navigation -->
		<div class="flex items-center gap-8">
			<a href="/" class="text-2xl font-bold text-primary">{siteName}</a>

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
			{#if session}
				<NotificationDropdown />
				<a
					href="/messages"
					class="relative font-medium text-foreground transition-colors hover:text-primary"
				>
					<MessageSquare class="h-5 w-5" />
					{#if chatManager.totalUnread > 0}
						<Badge
							variant="destructive"
							class="absolute -right-2.5 -top-2 h-4 min-w-4 px-1 text-[10px]"
						>
							{chatManager.totalUnread > 99 ? '99+' : chatManager.totalUnread}
						</Badge>
					{/if}
				</a>
			{/if}
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
							{m.nav_profile_view()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => goto('/dashboard')}>
							{m.nav_dashboard()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => goto('/watchlist')}>
							{m.nav_watchlist()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => goto('/settings/profile')}>
							{m.nav_settings()}
						</DropdownMenu.Item>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Languages class="mr-2 h-4 w-4" />
								{m.language_switcher_label()}
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item onclick={() => changeLanguage('en')}>
									{m.language_english_native()}
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => changeLanguage('es')}>
									{m.language_spanish_native()}
								</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						<DropdownMenu.Item variant="destructive" onclick={signOut}>
							{m.nav_sign_out()}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<a href="/login">
					<Button>{m.nav_sign_in()}</Button>
				</a>
			{/if}
		</div>
	</div>
</header>
