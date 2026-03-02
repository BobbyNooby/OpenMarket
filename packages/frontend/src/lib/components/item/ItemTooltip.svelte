<script lang="ts">
	interface Props {
		name: string;
		type: 'item' | 'currency' | string;
		description?: string;
	}

	let {
		name,
		type,
		description = ''
	}: Props = $props();
</script>

<div
	class="w-full max-w-64 rounded-lg border border-border bg-card p-4 shadow-2xl text-center"
>
	<h3 class="font-semibold text-foreground text-base mb-1">{name}</h3>
	<p class="text-xs font-medium uppercase text-muted-foreground mb-3">{type}</p>

	{#if description}
		<p class="text-sm text-muted-foreground">
			{description}
		</p>
	{/if}
</div>
