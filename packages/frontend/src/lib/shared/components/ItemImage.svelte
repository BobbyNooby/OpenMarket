<script lang="ts">
	interface Props {
		src?: string;
		alt?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
	}

	let { src = '', alt = 'Item', size = 'md', class: className = '' }: Props = $props();

	const sizeMap = {
		sm: 'w-12 h-12',
		md: 'w-16 h-16',
		lg: 'w-24 h-24',
		xl: 'w-32 h-32'
	};

	let imageError = $state(false);

	const displayName = $derived(() => {
		if (!alt || alt === 'Item') return '?';
		return alt.trim();
	});
</script>

<div
	class="flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] {sizeMap[
		size
	]} {className}"
>
	{#if src && !imageError}
		<img {src} {alt} class="h-full w-full object-cover" onerror={() => (imageError = true)} />
	{:else}
		<span
			class="line-clamp-3 break-words px-1 text-center text-[8px] font-bold leading-tight text-[var(--color-textSecondary)]"
		>
			{displayName()}
		</span>
	{/if}
</div>
