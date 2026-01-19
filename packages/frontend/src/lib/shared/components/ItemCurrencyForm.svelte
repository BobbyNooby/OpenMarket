<script lang="ts">
	import Input from './Input.svelte';
	import Textarea from './Textarea.svelte';
	import Select from './Select.svelte';
	import Button from './Button.svelte';
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

	const typeOptions = [
		{ value: 'item', label: 'Item' },
		{ value: 'currency', label: 'Currency' }
	];

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
			<h3 class="text-sm font-semibold text-[var(--color-text)]">Preview</h3>

			<!-- Image Square -->
			<ItemImage src={formData.image_url} alt={formData.name || 'Item preview'} size="xl" />

			<!-- Tooltip Preview (Always Visible) -->
			{#if formData.name || formData.description}
				<div>
					<ItemTooltip
						name={formData.name || 'Item name...'}
						type={formData.type || 'type'}
						description={formData.description}
					/>
					<p class="mt-2 text-xs text-[var(--color-textTertiary)]">Tooltip preview</p>
				</div>
			{/if}
		</div>

		<!-- Right Column: Form Fields -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-[var(--color-text)]">Item/Currency Details</h3>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Input
					bind:value={formData.name}
					label="Name"
					placeholder="Diamond Sword"
					required
					error={errors.name}
				/>
				<Select
					bind:value={formData.type}
					options={typeOptions}
					label="Type"
					placeholder="Select type..."
					required
					error={errors.type}
				/>
			</div>

			<Textarea
				bind:value={formData.description}
				label="Description"
				placeholder="A powerful weapon forged from the finest diamonds..."
				rows={4}
			/>

			<Input
				bind:value={formData.image_url}
				label="Image URL"
				placeholder="https://example.com/images/diamond_sword.png"
			/>

			<Input
				bind:value={formData.wiki_link}
				label="Wiki Link"
				placeholder="https://wiki.example.com/diamond_sword"
			/>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
		<Button type="button" variant="secondary" size="md" onclick={handleCancel}>Cancel</Button>
		<Button type="submit" variant="primary" size="md">
			{mode === 'create' ? 'Create Item/Currency' : 'Save Changes'}
		</Button>
	</div>
</form>
