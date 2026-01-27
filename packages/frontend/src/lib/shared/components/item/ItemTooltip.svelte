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
	class="w-full max-w-64 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-2xl)] text-center"
>
	<h3 class="font-semibold text-[var(--color-text)] text-base mb-1">{name}</h3>
	<p class="text-xs font-medium uppercase text-[var(--color-textTertiary)] mb-3">{type}</p>

	{#if description}
		<p class="text-sm text-[var(--color-textSecondary)]">
			{description}
		</p>
	{/if}
</div>
