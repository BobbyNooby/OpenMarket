<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import ItemImage from './ItemImage.svelte';
	import ItemTooltip from './ItemTooltip.svelte';
	import type { ItemFormData } from '$lib/api/types';

	interface Props {
		data?: Partial<ItemFormData> | null;
		mode?: 'create' | 'edit';
		onSubmit?: (data: ItemFormData) => void;
		onCancel?: () => void;
	}

	let { data = null, mode = 'create', onSubmit, onCancel }: Props = $props();

	let formData = $state<ItemFormData>({
		id: data?.id || undefined,
		name: data?.name || '',
		type: data?.type || '',
		description: data?.description || '',
		wiki_link: data?.wiki_link || '',
		image_url: data?.image_url || ''
	});

	let errors = $state({
		name: '',
		type: ''
	});

	function validate(): boolean {
		errors.name = formData.name.trim() === '' ? 'Name is required' : '';
		errors.type = formData.type === '' ? 'Type is required' : '';

		return !errors.name && !errors.type;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (validate()) {
			onSubmit?.(formData);
		}
	}

	function handleCancel() {
		onCancel?.();
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
		<!-- Left Column: Image Preview -->
		<div class="space-y-3">
			<h3 class="text-sm font-semibold text-foreground">Preview</h3>

			<ItemImage src={formData.image_url} alt={formData.name || 'Item preview'} size="xl" />

			{#if formData.name || formData.description}
				<div>
					<ItemTooltip
						name={formData.name || 'Item name...'}
						type={formData.type || 'type'}
						description={formData.description}
					/>
					<p class="mt-2 text-xs text-muted-foreground">Tooltip preview</p>
				</div>
			{/if}
		</div>

		<!-- Right Column: Form Fields -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-foreground">Item Details</h3>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="item-name">Name <span class="text-destructive">*</span></Label>
					<Input
						id="item-name"
						bind:value={formData.name}
						placeholder="Diamond Sword"
					/>
					{#if errors.name}
						<p class="text-sm text-destructive">{errors.name}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="item-type">Type <span class="text-destructive">*</span></Label>
					<select
						id="item-type"
						bind:value={formData.type}
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					>
						<option value="" disabled>Select type...</option>
						<option value="item">Item</option>
						<option value="currency">Currency</option>
					</select>
					{#if errors.type}
						<p class="text-sm text-destructive">{errors.type}</p>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<Label for="item-desc">Description</Label>
				<Textarea
					id="item-desc"
					bind:value={formData.description}
					placeholder="A powerful weapon forged from the finest diamonds..."
					rows={4}
				/>
			</div>

			<div class="space-y-2">
				<Label for="item-image">Image URL</Label>
				<Input
					id="item-image"
					bind:value={formData.image_url}
					placeholder="https://example.com/images/diamond_sword.png"
				/>
			</div>

			<div class="space-y-2">
				<Label for="item-wiki">Wiki Link</Label>
				<Input
					id="item-wiki"
					bind:value={formData.wiki_link}
					placeholder="https://wiki.example.com/diamond_sword"
				/>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-3 border-t border-border pt-4">
		<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
		<Button type="submit">
			{mode === 'create' ? 'Create Item' : 'Save Changes'}
		</Button>
	</div>
</form>
