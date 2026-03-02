<script lang="ts">
	import { ItemForm, ItemButton } from '$lib/components';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { ItemFormData, GenericItem } from '$lib/api/types';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

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

			showForm = false;
			editingItem = null;
		} catch (err: any) {
			error = err.message || 'An error occurred';
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
		if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
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
		} catch (err: any) {
			error = err.message || 'An error occurred';
			alert(`Error: ${error}`);
		} finally {
			isLoading = false;
		}
	}

	function handleCreate() {
		editingItem = null;
		error = null;
		showForm = true;
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-8 py-12">
		<!-- Header -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold text-foreground">Admin Panel</h1>
				<p class="mt-2 text-muted-foreground">
					Manage items and currencies
				</p>
			</div>
			<Button onclick={handleCreate} disabled={isLoading}>
				+ Create Item/Currency
			</Button>
		</div>

		<!-- Dialog for Form -->
		<Dialog.Root bind:open={showForm}>
			<Dialog.Content class="sm:max-w-4xl">
				<Dialog.Header>
					<Dialog.Title>
						{editingItem ? 'Edit Item/Currency' : 'Create New Item/Currency'}
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
					onSubmit={handleSubmit}
					onCancel={handleCancel}
				/>
				{#if isLoading}
					<div class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
						<div class="text-foreground">Saving...</div>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Root>

		<!-- Items Section -->
		<div class="mb-8 rounded-lg border border-border bg-card shadow-md">
			<div class="border-b border-border p-6">
				<h2 class="text-2xl font-semibold text-foreground">
					Items ({data.items?.length || 0})
				</h2>
			</div>

			{#if !data.items?.length}
				<div class="p-12 text-center">
					<p class="text-lg text-muted-foreground">
						No items yet. Create one to get started!
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
											Edit
										</button>
										<button
											onclick={() => handleDelete(item)}
											disabled={isLoading}
											class="text-xs text-destructive hover:underline disabled:opacity-50"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Currencies Section -->
		<div class="rounded-lg border border-border bg-card shadow-md">
			<div class="border-b border-border p-6">
				<h2 class="text-2xl font-semibold text-foreground">
					Currencies ({data.currencies?.length || 0})
				</h2>
			</div>

			{#if !data.currencies?.length}
				<div class="p-12 text-center">
					<p class="text-lg text-muted-foreground">
						No currencies yet. Create one to get started!
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
											Edit
										</button>
										<button
											onclick={() => handleDelete(currency)}
											disabled={isLoading}
											class="text-xs text-destructive hover:underline disabled:opacity-50"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
