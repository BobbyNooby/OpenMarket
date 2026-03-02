<script lang="ts">
	import { goto } from '$app/navigation';
	import ItemImage from './ItemImage.svelte';
	import ItemTooltip from './ItemTooltip.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

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

	function handleClick() {
		if (onclick) {
			onclick();
		} else if (slug) {
			goto(`/listings/${slug}`);
		}
	}
</script>

<div class="relative inline-block h-16 w-16">
	<Tooltip.Root>
		<Tooltip.Trigger
			class="group h-full w-full rounded-md transition-all hover:scale-105 {className}"
			onclick={handleClick}
		>
			<ItemImage src={image_url} alt={name} size="md" />
		</Tooltip.Trigger>
		<Tooltip.Content
			side="bottom"
			sideOffset={8}
			class="border-none bg-transparent p-0 shadow-none"
			arrowClasses="hidden"
		>
			<ItemTooltip {name} {type} {description} />
		</Tooltip.Content>
	</Tooltip.Root>

	{#if amount !== undefined && amount > 0}
		<div
			class="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md"
		>
			{amount}
		</div>
	{/if}
</div>
