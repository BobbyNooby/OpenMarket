<script lang="ts">
	import { AddListingForm } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import { authClient } from '$lib/api/client';
	import type { Item, Currency } from '$lib/api/types';

	let { data } = $props();

	const session = $derived(data.session);
	const items = $derived((data.items || []) as unknown as Item[]);
	const currencies = $derived((data.currencies || []) as unknown as Currency[]);

	async function signInWithDiscord() {
		await authClient.signIn.social({
			provider: 'discord',
			callbackURL: window.location.href
		});
	}
</script>

<div class="min-h-screen text-foreground">
	<div class="bg-card py-8 shadow-sm">
		<div class="mx-auto max-w-3xl px-8">
			<h1 class="text-3xl font-bold text-primary">Create New Listing</h1>
			<p class="mt-2 text-muted-foreground">
				Create a new trade listing to buy or sell items
			</p>
		</div>
	</div>

	<div class="mx-auto max-w-3xl px-8 py-8">
		{#if !session?.user}
			<div class="text-center py-12">
				<p class="text-lg text-muted-foreground mb-4">
					You need to sign in to create a listing
				</p>
				<Button onclick={signInWithDiscord}>Sign In with Discord</Button>
			</div>
		{:else}
			<AddListingForm {items} {currencies} authorId={session.user.id} />
		{/if}
	</div>
</div>
