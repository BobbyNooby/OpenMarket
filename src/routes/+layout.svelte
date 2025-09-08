<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { hydrateThemeFromSSR } from '$lib/design/theme';

	let { children, data } = $props();

	hydrateThemeFromSSR(data.theme);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
