<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import ItemImage from './ItemImage.svelte';
	import ItemTooltip from './ItemTooltip.svelte';
	import type { ItemFormData } from '$lib/api/types';

	interface Category {
		id: string;
		name: string;
		slug: string;
		icon_url: string | null;
	}

	interface Props {
		data?: Partial<ItemFormData> | null;
		mode?: 'create' | 'edit';
		categories?: Category[];
		onSubmit?: (data: ItemFormData) => void;
		onCancel?: () => void;
	}

	let { data = null, mode = 'create', categories = [], onSubmit, onCancel }: Props = $props();

	let formData = $state<ItemFormData>({
		id: data?.id || undefined,
		name: data?.name || '',
		type: data?.type || '',
		description: data?.description || '',
		wiki_link: data?.wiki_link || '',
		image_url: data?.image_url || '',
		category_id: data?.category_id || null
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
					<Label>Type <span class="text-destructive">*</span></Label>
					<Select.Root
						type="single"
						value={formData.type || undefined}
						onValueChange={(val) => { formData.type = val as typeof formData.type; }}
					>
						<Select.Trigger class="w-full">
							<span class={formData.type ? '' : 'text-muted-foreground'}>
								{formData.type === 'item' ? 'Item' : formData.type === 'currency' ? 'Currency' : 'Select type...'}
							</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="item" label="Item" />
							<Select.Item value="currency" label="Currency" />
						</Select.Content>
					</Select.Root>
					{#if errors.type}
						<p class="text-sm text-destructive">{errors.type}</p>
					{/if}
				</div>
			</div>

			{#if formData.type === 'item' && categories.length > 0}
				<div class="space-y-2">
					<Label>Category</Label>
					<Select.Root
						type="single"
						value={formData.category_id || undefined}
						onValueChange={(val) => { formData.category_id = val || null; }}
					>
						<Select.Trigger class="w-full">
							<span class={formData.category_id ? '' : 'text-muted-foreground'}>
								{categories.find(c => c.id === formData.category_id)?.name || 'No category'}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#each categories as cat}
								<Select.Item value={cat.id} label={cat.name} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

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
