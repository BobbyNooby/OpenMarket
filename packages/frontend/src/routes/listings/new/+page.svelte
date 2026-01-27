<script lang="ts">
	import { AddListingForm, Button } from '$lib/shared/components';
	import { authClient } from '$lib/api/client';
	import type { Item, Currency } from '$lib/api/types';

	let { data } = $props();

	// Use server-side session from layout
	const session = $derived(data.session);
	const items = $derived((data.items || []) as unknown as Item[]);
	const currencies = $derived((data.currencies || []) as unknown as Currency[]);

	// Only authClient is needed for OAuth redirect (must be client-side)
	async function signInWithDiscord() {
		await authClient.signIn.social({
			provider: 'discord',
			callbackURL: window.location.href
		});
	}
</script>

<div class="min-h-screen text-[var(--color-text)]">
	<!-- Header -->
	<div class="bg-[var(--color-surface)] py-8 shadow-[var(--shadow-sm)]">
		<div class="mx-auto max-w-3xl px-8">
			<h1 class="text-3xl font-bold text-[var(--color-primary)]">Create New Listing</h1>
			<p class="mt-2 text-[var(--color-textSecondary)]">
				Create a new trade listing to buy or sell items
			</p>
		</div>
	</div>

	<!-- Content -->
	<div class="mx-auto max-w-3xl px-8 py-8">
		{#if !session?.user}
			<div class="text-center py-12">
				<p class="text-lg text-[var(--color-textSecondary)] mb-4">
					You need to sign in to create a listing
				</p>
				<Button onclick={signInWithDiscord}>Sign In with Discord</Button>
			</div>
		{:else}
			<AddListingForm {items} {currencies} authorId={session.user.id} />
		{/if}
	</div>
</div>
