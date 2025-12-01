<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { injectThemeVariables } from '$lib/design/cssVariables';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		injectThemeVariables();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
