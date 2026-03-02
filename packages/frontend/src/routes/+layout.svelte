<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { toggleTheme, themeMode, initTheme } from '$lib/design/theme';
	import { Header } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		initTheme();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative min-h-screen bg-background">
	<Header session={data.session} />

	<div class="fixed right-4 top-4 z-50">
		<Button variant="outline" size="sm" onclick={() => toggleTheme()}>
			{$themeMode === 'dark' ? '☀️' : '🌙'}
		</Button>
	</div>

	{@render children?.()}
</div>
