<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { injectThemeVariables } from '$lib/design/cssVariables';
	import { toggleTheme, theme } from '$lib/design/theme';
	import { Header } from '$lib/shared/components';
	import Button from '$lib/shared/components/Button.svelte';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		injectThemeVariables();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative min-h-screen bg-[var(--color-background)] transition-colors duration-100">
	<!-- Sticky Header -->
	<Header session={data.session} />

	<!-- Theme Switcher Button - Fixed Top Right -->
	<div class="fixed right-4 top-4 z-50">
		<Button variant="secondary" size="sm" onclick={() => toggleTheme()}>
			{$theme.name === 'dark' ? '☀️' : '🌙'}
		</Button>
	</div>

	{@render children?.()}
</div>
