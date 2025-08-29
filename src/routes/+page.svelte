<script lang="ts">
	import { MarketAPI } from '$lib/api/market';
	import { SignIn } from '@auth/sveltekit/components';
	import { onMount } from 'svelte';

	onMount(async () => {
		console.log(await (await MarketAPI.ping()).json());
		console.log(
			await (
				await MarketAPI.userUpdate({
					id: '1',
					username: 'test',
					display_name: 'test',
					avatar_url: 'test'
				})
			).json()
		);
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<SignIn provider="discord">
	<div slot="submitButton" class="buttonPrimary">Sign in</div>
</SignIn>
