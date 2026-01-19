<script lang="ts">
	import { AddListingForm, Button } from '$lib/shared/components';
	import { authClient } from '$lib/api/client';
	import type { Item, Currency } from '$lib/api/types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let session = $state<any>(null);
	let loading = $state(true);

	const items = $derived((data.items || []) as Item[]);
	const currencies = $derived((data.currencies || []) as Currency[]);

	onMount(async () => {
		const result = await authClient.getSession();
		session = result.data?.session;
		loading = false;
	});

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
		{#if loading}
			<p class="text-center text-[var(--color-textSecondary)]">Loading...</p>
		{:else if !session}
			<div class="text-center py-12">
				<p class="text-lg text-[var(--color-textSecondary)] mb-4">
					You need to sign in to create a listing
				</p>
				<Button onclick={signInWithDiscord}>Sign In with Discord</Button>
			</div>
		{:else}
			<AddListingForm {items} {currencies} authorId={session.userId} />
		{/if}
	</div>
</div>
