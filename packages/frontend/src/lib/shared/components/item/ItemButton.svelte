<script lang="ts">
	import { goto } from '$app/navigation';
	import ItemImage from './ItemImage.svelte';
	import ItemTooltip from './ItemTooltip.svelte';

	interface Props {
		name: string;
		type: 'item' | 'currency' | string;
		description?: string;
		image_url?: string;
		item_id?: string;
		slug?: string;
		amount?: number;
		onclick?: () => void;
		class?: string;
	}

	let {
		name,
		type,
		description = '',
		image_url = '',
		item_id = '',
		slug = '',
		amount,
		onclick,
		class: className = ''
	}: Props = $props();

	let showTooltip = $state(false);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	function handleMouseMove(e: MouseEvent) {
		tooltipX = e.clientX;
		tooltipY = e.clientY;
	}

	function handleClick() {
		console.log('ItemButton clicked:', { name, type, item_id, slug });
		if (onclick) {
			onclick();
		} else if (slug) {
			goto(`/listings/${slug}`);
		}
	}
</script>

<div class="relative inline-block h-16 w-16">
	<button
		type="button"
		class="group h-full w-full rounded-[var(--radius-md)] transition-all hover:scale-105 {className}"
		onmouseenter={() => (showTooltip = true)}
		onmouseleave={() => (showTooltip = false)}
		onmousemove={handleMouseMove}
		onclick={handleClick}
	>
		<ItemImage src={image_url} alt={name} size="md" />
	</button>

	{#if amount !== undefined && amount > 0}
		<div
			class="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white shadow-[var(--shadow-md)]"
		>
			{amount}
		</div>
	{/if}
</div>

{#if showTooltip}
	<div
		class="pointer-events-none fixed z-[9999]"
		style="left: {tooltipX + 16}px; top: {tooltipY + 16}px;"
	>
		<ItemTooltip {name} {type} {description} />
	</div>
{/if}
