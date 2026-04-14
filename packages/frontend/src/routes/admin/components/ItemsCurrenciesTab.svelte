<script lang="ts">
	import { ItemForm, ItemButton } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { ItemFormData, GenericItem } from '$lib/api/types';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';
	import { apiFetch, apiJson } from './admin-api';
	import Upload from '@lucide/svelte/icons/upload';
	import Download from '@lucide/svelte/icons/download';

	interface Props {
		data: {
			items?: any[];
			currencies?: any[];
			categories?: any[];
			[key: string]: any;
		};
	}

	let { data }: Props = $props();

	let allItems = $derived<GenericItem[]>([
		...(data.items || []).map((item: any) => ({ ...item, type: 'item' as const })),
		...(data.currencies || []).map((currency: any) => ({ ...currency, type: 'currency' as const }))
	]);

	let showForm = $state(false);
	let editingItem = $state<GenericItem | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function submitFormAction(action: string, formData: FormData) {
		const res = await fetch(`?/${action}`, {
			method: 'POST',
			body: formData
		});
		const result = await res.json();
		if (result.type === 'failure') {
			throw new Error(result.data?.error || 'Action failed');
		}
		return result;
	}

	async function handleSubmit(formDataInput: ItemFormData) {
		isLoading = true;
		error = null;

		try {
			const formData = new FormData();
			formData.set('name', formDataInput.name);
			if (formDataInput.description) formData.set('description', formDataInput.description);
			if (formDataInput.wiki_link) formData.set('wiki_link', formDataInput.wiki_link);
			if (formDataInput.image_url) formData.set('image_url', formDataInput.image_url);
			if (formDataInput.category_id) formData.set('category_id', formDataInput.category_id);

			if (editingItem) {
				formData.set('id', editingItem.id);
				if (editingItem.type === 'item') {
					await submitFormAction('updateItem', formData);
				} else {
					await submitFormAction('updateCurrency', formData);
				}
			} else {
				if (formDataInput.type === 'item') {
					await submitFormAction('createItem', formData);
				} else {
					await submitFormAction('createCurrency', formData);
				}
			}

			await invalidateAll();

			toast.success(editingItem ? m.admin_item_updated({ name: formDataInput.name }) : m.admin_item_created({ name: formDataInput.name }));
			showForm = false;
			editingItem = null;
		} catch (err: any) {
			error = err.message || 'An error occurred';
			toast.error(error!);
		} finally {
			isLoading = false;
		}
	}

	function handleCancel() {
		showForm = false;
		editingItem = null;
		error = null;
	}

	function handleEdit(item: GenericItem) {
		editingItem = item;
		error = null;
		showForm = true;
	}

	async function handleDelete(item: GenericItem) {
		if (!confirm(m.admin_item_delete_confirm({ name: item.name }))) {
			return;
		}

		isLoading = true;
		error = null;

		try {
			const formData = new FormData();
			formData.set('id', item.id);

			if (item.type === 'item') {
				await submitFormAction('deleteItem', formData);
			} else {
				await submitFormAction('deleteCurrency', formData);
			}

			await invalidateAll();
			toast.success(m.admin_item_deleted({ name: item.name }));
		} catch (err: any) {
			error = err.message || 'An error occurred';
			toast.error(error!);
		} finally {
			isLoading = false;
		}
	}

	function handleCreate() {
		editingItem = null;
		error = null;
		showForm = true;
	}
	let importInputEl: HTMLInputElement | undefined = $state();
	let importHelpOpen = $state(false);

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';

		try {
			const text = await file.text();
			const json = JSON.parse(text);

			if (!json.items && !json.currencies) {
				toast.error('JSON must have an "items" and/or "currencies" array');
				return;
			}

			const result = await apiJson('/admin/import', 'POST', json);

			if (result.success) {
				const parts = [];
				if (result.items_imported || result.items_skipped) parts.push(`Items: ${result.items_imported} imported, ${result.items_skipped} skipped`);
				if (result.currencies_imported || result.currencies_skipped) parts.push(`Currencies: ${result.currencies_imported} imported, ${result.currencies_skipped} skipped`);
				toast.success(parts.join('. ') || 'Nothing to import');
				if (result.errors?.length) {
					result.errors.forEach((err: string) => toast.error(err));
				}
				await invalidateAll();
			} else {
				toast.error(result.error || 'Import failed');
			}
		} catch {
			toast.error('Invalid JSON file');
		}
	}

	async function handleExport() {
		const { PUBLIC_API_URL } = await import('$env/static/public');
		const result = await fetch(`${PUBLIC_API_URL}/admin/export`, { credentials: 'include' });
		if (!result.ok) {
			toast.error('Export failed');
			return;
		}
		const blob = await result.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'catalog.json';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="flex items-center justify-between mb-6">
	<p class="text-muted-foreground">{m.admin_items_manage()}</p>
	<div class="flex items-center gap-2">
		<Button variant="outline" size="sm" onclick={handleExport}>
			<Download class="mr-1.5 h-3.5 w-3.5" />
			Export
		</Button>
		<Button variant="outline" size="sm" onclick={() => { importHelpOpen = true; }}>
			<Upload class="mr-1.5 h-3.5 w-3.5" />
			Import JSON
		</Button>
		<Button onclick={handleCreate} disabled={isLoading}>
			+ {m.admin_items_create()}
		</Button>
	</div>
</div>

<input
	bind:this={importInputEl}
	type="file"
	accept=".json"
	class="hidden"
	onchange={handleImport}
/>

<!-- Import help dialog -->
<Dialog.Root bind:open={importHelpOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Import Items or Currencies</Dialog.Title>
			<Dialog.Description>Upload a JSON file matching one of the formats below.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<p class="text-sm font-medium">JSON format</p>
				<pre class="rounded-md bg-muted p-3 text-xs overflow-x-auto">{`{
  "items": [
    {
      "name": "Diamond Sword",
      "description": "A powerful blade",
      "image_url": "https://...",
      "category": "weapons"
    }
  ],
  "currencies": [
    {
      "name": "Gold Coins",
      "description": "Standard currency"
    }
  ]
}`}</pre>
				<p class="text-xs text-muted-foreground">Include one or both arrays in a single file.</p>
			</div>

			<div class="rounded-md border border-border p-3 text-xs text-muted-foreground space-y-1">
				<p><strong>name</strong> is required. All other fields are optional.</p>
				<p><strong>slug</strong> is auto-generated from name if not provided.</p>
				<p><strong>category</strong> can be a slug (e.g. "weapons") or name (e.g. "Weapons").</p>
				<p>Duplicates (by slug) are skipped automatically.</p>
				<p>Max 500 entries per import.</p>
			</div>
		</div>

		<div class="flex justify-between">
			<Button variant="ghost" size="sm" onclick={() => { importHelpOpen = false; }}>Cancel</Button>
			<Button size="sm" onclick={() => { importHelpOpen = false; importInputEl?.click(); }}>
				<Upload class="mr-1.5 h-3.5 w-3.5" />
				Choose file
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showForm}>
	<Dialog.Content class="sm:max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>
				{editingItem ? m.admin_item_edit_title() : m.admin_item_create_title()}
			</Dialog.Title>
		</Dialog.Header>
		{#if error}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}
		<ItemForm
			data={editingItem}
			mode={editingItem ? 'edit' : 'create'}
			categories={data.categories || []}
			onSubmit={handleSubmit}
			onCancel={handleCancel}
		/>
		{#if isLoading}
			<div class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
				<div class="text-foreground">{m.admin_item_saving()}</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<div class="mb-8 rounded-lg border border-border bg-card shadow-md">
	<div class="border-b border-border p-6">
		<h2 class="text-2xl font-semibold text-foreground">
			{m.admin_items_section_items({ count: data.items?.length || 0 })}
		</h2>
	</div>

	{#if !data.items?.length}
		<div class="p-12 text-center">
			<p class="text-lg text-muted-foreground">
				{m.admin_item_no_items()}
			</p>
		</div>
	{:else}
		<div class="p-6">
			<div class="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
				{#each allItems.filter(i => i.type === 'item') as item}
					<div class="space-y-2">
						<ItemButton
							name={item.name}
							type={item.type}
							description={item.description}
							image_url={item.image_url}
							amount={1}
						/>
						<div class="space-y-1">
							<p class="truncate text-sm font-semibold text-foreground">
								{item.name}
							</p>
							<div class="flex gap-2">
								<button
									onclick={() => handleEdit(item)}
									disabled={isLoading}
									class="text-xs text-primary hover:underline disabled:opacity-50"
								>
									{m.button_edit()}
								</button>
								<button
									onclick={() => handleDelete(item)}
									disabled={isLoading}
									class="text-xs text-destructive hover:underline disabled:opacity-50"
								>
									{m.admin_item_delete()}
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="rounded-lg border border-border bg-card shadow-md">
	<div class="border-b border-border p-6">
		<h2 class="text-2xl font-semibold text-foreground">
			{m.admin_items_section_currencies({ count: data.currencies?.length || 0 })}
		</h2>
	</div>

	{#if !data.currencies?.length}
		<div class="p-12 text-center">
			<p class="text-lg text-muted-foreground">
				{m.admin_item_no_currencies()}
			</p>
		</div>
	{:else}
		<div class="p-6">
			<div class="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
				{#each allItems.filter(i => i.type === 'currency') as currency}
					<div class="space-y-2">
						<ItemButton
							name={currency.name}
							type={currency.type}
							description={currency.description}
							image_url={currency.image_url}
							amount={1}
						/>
						<div class="space-y-1">
							<p class="truncate text-sm font-semibold text-foreground">
								{currency.name}
							</p>
							<div class="flex gap-2">
								<button
									onclick={() => handleEdit(currency)}
									disabled={isLoading}
									class="text-xs text-primary hover:underline disabled:opacity-50"
								>
									{m.button_edit()}
								</button>
								<button
									onclick={() => handleDelete(currency)}
									disabled={isLoading}
									class="text-xs text-destructive hover:underline disabled:opacity-50"
								>
									{m.admin_item_delete()}
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
