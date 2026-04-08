<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';
	import { authClient } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	let tab = $state<'signin' | 'register'>('signin');
	let email = $state('');
	let password = $state('');
	let username = $state('');
	let loading = $state(false);
	let checkingUsername = $state(false);
	let usernameAvailable = $state<boolean | null>(null);

	const siteName = $derived(data.siteConfig?.site_name ?? 'OpenMarket');

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
			const data = await res.json();
			usernameAvailable = data.available;
		} catch {
			usernameAvailable = null;
		} finally {
			checkingUsername = false;
		}
	}

	$effect(() => {
		if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
		if (tab === 'register' && username.length >= 3) {
			usernameCheckTimeout = setTimeout(() => checkUsername(username), 300);
		}
	});

	function sanitizeUsername(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9_]/g, '')
			.replace(/^_+|_+$/g, '')
			.slice(0, 20);
	}

	async function handleSignIn() {
		if (!email || !password) {
			toast.error('Please fill in all fields');
			return;
		}
		loading = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/auth/sign-in/email`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password })
			});
			const data = await res.json();
			if (data.error) {
				toast.error(data.error.message || 'Failed to sign in');
				return;
			}
			toast.success('Signed in successfully');
			// Check if user has profile
			const sessionRes = await fetch(`${PUBLIC_API_URL}/api/auth/get-session`, { credentials: 'include' });
			const session = await sessionRes.json();
			if (session.hasProfile === false) {
				goto('/onboarding');
			} else {
				goto('/');
			}
		} catch {
			toast.error('Failed to sign in');
		} finally {
			loading = false;
		}
	}

	async function handleRegister() {
		if (!email || !password || !username) {
			toast.error('Please fill in all fields');
			return;
		}
		if (username.length < 3 || username.length > 20) {
			toast.error('Username must be 3-20 characters');
			return;
		}
		if (!/^[a-z0-9_]+$/.test(username)) {
			toast.error('Username can only contain letters, numbers, and underscores');
			return;
		}
		if (usernameAvailable === false) {
			toast.error('Username is already taken');
			return;
		}
		loading = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/auth/sign-up/email`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password, name: username })
			});
			const data = await res.json();
			if (data.error) {
				toast.error(data.error.message || 'Failed to create account');
				return;
			}
			toast.success('Account created successfully');
			goto('/onboarding');
		} catch {
			toast.error('Failed to create account');
		} finally {
			loading = false;
		}
	}

	async function handleDiscordSignIn() {
		await authClient.signIn.social({
			provider: 'discord',
			callbackURL: window.location.origin
		});
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const error = params.get('error');
		if (error === 'oauth') {
			toast.error('Failed to sign in with Discord');
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl">{siteName}</Card.Title>
			<Card.Description>{m.login_title()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<Tabs.Root bind:value={tab} class="w-full">
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="signin">{m.login_tab_signin()}</Tabs.Trigger>
					<Tabs.Trigger value="register">{m.login_tab_register()}</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="signin" class="mt-6 space-y-4">
					<div class="space-y-2">
						<Label for="signin-email">{m.login_email()}</Label>
						<Input
							id="signin-email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							disabled={loading}
						/>
					</div>
					<div class="space-y-2">
						<Label for="signin-password">{m.login_password()}</Label>
						<Input
							id="signin-password"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							disabled={loading}
						/>
					</div>
					<Button class="w-full" onclick={handleSignIn} disabled={loading}>
						{#if loading}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						{loading ? m.login_signing_in() : m.login_button_signin()}
					</Button>
				</Tabs.Content>

				<Tabs.Content value="register" class="mt-6 space-y-4">
					<div class="space-y-2">
						<Label for="register-username">{m.login_username()}</Label>
						<div class="relative">
							<Input
								id="register-username"
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
					<div class="space-y-2">
						<Label for="register-email">{m.login_email()}</Label>
						<Input
							id="register-email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							disabled={loading}
						/>
					</div>
					<div class="space-y-2">
						<Label for="register-password">{m.login_password()}</Label>
						<Input
							id="register-password"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							disabled={loading}
						/>
					</div>
					<Button class="w-full" onclick={handleRegister} disabled={loading || usernameAvailable === false}>
						{#if loading}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						{loading ? m.login_registering() : m.login_button_register()}
					</Button>
				</Tabs.Content>
			</Tabs.Root>

			<div class="relative my-6">
				<div class="absolute inset-0 flex items-center">
					<span class="w-full border-t border-border"></span>
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-card px-2 text-muted-foreground">{m.login_or()}</span>
				</div>
			</div>

			<Button variant="outline" class="w-full" onclick={handleDiscordSignIn} disabled={loading}>
				<svg class="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
					<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.332-.946 2.418-2.157 2.418z"/>
				</svg>
				{m.login_with_discord()}
			</Button>
		</Card.Content>
	</Card.Root>
</div>