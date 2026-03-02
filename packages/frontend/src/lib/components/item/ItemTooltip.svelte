<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

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

<Card.Root class="w-full max-w-64 gap-2 py-3 text-center shadow-2xl">
	<Card.Header class="items-center gap-1 px-4">
		<Card.Title class="text-base">{name}</Card.Title>
		<Badge variant="outline" class="w-fit uppercase">{type}</Badge>
	</Card.Header>

	{#if description}
		<Card.Content class="px-4">
			<p class="text-sm text-muted-foreground">{description}</p>
		</Card.Content>
	{/if}
</Card.Root>
