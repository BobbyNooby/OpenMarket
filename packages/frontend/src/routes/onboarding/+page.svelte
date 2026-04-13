<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	// Sanitize Discord name to valid username
	function sanitizeUsername(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9_]/g, '')
			.replace(/^_+|_+$/g, '')
			.slice(0, 20) || 'user';
	}

	const suggestedUsername = sanitizeUsername(data.user?.name || '');
	const siteName = $derived(data.siteConfig?.site_name ?? 'OpenMarket');
	const welcomeText = $derived(m.onboarding_welcome({ site: siteName }));
	let username = $state(suggestedUsername);
	let loading = $state(false);
	let checkingUsername = $state(false);
	let usernameAvailable = $state<boolean | null>(null);

	let usernameCheckTimeout: ReturnType<typeof setTimeout> | null = null;

	async function checkUsername(value: string) {
		if (value.length < 3) {
			usernameAvailable = null;
			return;
		}
		checkingUsername = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/users/username-available?username=${encodeURIComponent(value)}`, {
				credentials: 'include'
			});
			const json = await res.json();
			usernameAvailable = json.available;
		} catch {
			usernameAvailable = null;
		} finally {
			checkingUsername = false;
		}
	}

	$effect(() => {
		if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
		if (username.length >= 3) {
			usernameCheckTimeout = setTimeout(() => checkUsername(username), 300);
		}
	});

	$effect(() => {
		// Check initial username
		if (suggestedUsername.length >= 3) {
			checkUsername(suggestedUsername);
		}
	});

	async function handleSubmit() {
		if (!username || username.length < 3 || username.length > 20) {
			toast.error('Username must be 3-20 characters');
			return;
		}
		if (!/^[a-z0-9_]+$/.test(username)) {
			toast.error('Username can only contain lowercase letters, numbers, and underscores');
			return;
		}
		if (usernameAvailable === false) {
			toast.error('Username is already taken');
			return;
		}

		loading = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/users/complete-onboarding`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ username })
			});
			const json = await res.json();

			if (!json.success) {
				toast.error(json.error || 'Failed to complete setup');
				return;
			}

			if (json.isAdmin) {
				toast.success('You are the first user — admin role has been assigned!', { duration: 8000 });
			} else {
				toast.success(m.onboarding_welcome_toast({ site: siteName }));
			}
			goto('/');
		} catch {
			toast.error('Failed to complete setup');
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl">{welcomeText}</Card.Title>
			<Card.Description>{m.onboarding_subtitle()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="mb-4 text-center">
				<p class="text-sm text-muted-foreground">
					{#if data.user?.image}
						<img src={data.user.image} alt="Avatar" class="mx-auto mb-3 h-16 w-16 rounded-full" />
					{/if}
					<span class="font-medium text-foreground">{data.user?.name || 'User'}</span>
				</p>
			</div>

			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="username">{m.onboarding_username_label()}</Label>
					<div class="relative">
						<Input
							id="username"
							type="text"
							placeholder="choose_a_username"
							bind:value={username}
							disabled={loading}
						/>
						{#if checkingUsername}
							<Loader2 class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
						{:else if usernameAvailable === true}
							<Check class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
						{:else if usernameAvailable === false}
							<X class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
						{/if}
					</div>
					<p class="text-xs text-muted-foreground">
						{m.settings_profile_username_hint()}
					</p>
				</div>

				<Button class="w-full" onclick={handleSubmit} disabled={loading || usernameAvailable === false}>
					{#if loading}
						<Loader2 class="h-4 w-4 animate-spin" />
					{/if}
					{loading ? m.onboarding_completing() : m.onboarding_complete_button()}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>