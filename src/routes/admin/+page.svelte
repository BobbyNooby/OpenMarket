<script lang="ts">
	import ItemCurrencyForm from '$lib/shared/components/ItemCurrencyForm.svelte';
	import Modal from '$lib/shared/components/Modal.svelte';
	import Button from '$lib/shared/components/Button.svelte';
	import ItemButton from '$lib/shared/components/ItemButton.svelte';
	import type { ItemFormData, GenericItem } from '$lib/api/types';
	import { api } from '$lib/api/client';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	// Initialize with items from API (combine items and currencies with type field)
	let allItems = $derived<GenericItem[]>([
		...(data.items || []).map((item: any) => ({ ...item, type: 'item' as const })),
		...(data.currencies || []).map((currency: any) => ({ ...currency, type: 'currency' as const }))
	]);

	let showForm = $state(false);
	let editingItem = $state<GenericItem | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Handle form submission
	async function handleSubmit(formData: ItemFormData) {
		isLoading = true;
		error = null;

		try {
			if (editingItem) {
				// Edit existing item/currency
				if (editingItem.type === 'item') {
					// @ts-expect-error - Eden treaty type inference issue with dynamic routes
					const result = await api.items({ id: editingItem.id }).put({
						name: formData.name,
						description: formData.description || undefined,
						wiki_link: formData.wiki_link || undefined,
						image_url: formData.image_url || undefined
					});
					if (!result.data?.success) {
						throw new Error(result.data?.error || 'Failed to update item');
					}
				} else {
					// @ts-expect-error - Eden treaty type inference issue with dynamic routes
					const result = await api.currencies({ id: editingItem.id }).put({
						name: formData.name,
						description: formData.description || undefined,
						wiki_link: formData.wiki_link || undefined,
						image_url: formData.image_url || undefined
					});
					if (!result.data?.success) {
						throw new Error(result.data?.error || 'Failed to update currency');
					}
				}
			} else {
				// Create new item/currency
				if (formData.type === 'item') {
					const result = await api.items.post({
						name: formData.name,
						description: formData.description || undefined,
						wiki_link: formData.wiki_link || undefined,
						image_url: formData.image_url || undefined
					});
					if (!result.data?.success) {
						throw new Error(result.data?.error || 'Failed to create item');
					}
				} else {
					const result = await api.currencies.post({
						name: formData.name,
						description: formData.description || undefined,
						wiki_link: formData.wiki_link || undefined,
						image_url: formData.image_url || undefined
					});
					if (!result.data?.success) {
						throw new Error(result.data?.error || 'Failed to create currency');
					}
				}
			}

			// Refresh data from server
			await invalidateAll();

			// Reset form
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
			if (item.type === 'item') {
				// @ts-expect-error - Eden treaty type inference issue with dynamic routes
				const result = await api.items({ id: item.id }).delete();
				if (!result.data?.success) {
					throw new Error(result.data?.error || 'Failed to delete item');
				}
			} else {
				// @ts-expect-error - Eden treaty type inference issue with dynamic routes
				const result = await api.currencies({ id: item.id }).delete();
				if (!result.data?.success) {
					throw new Error(result.data?.error || 'Failed to delete currency');
				}
			}

			// Refresh data from server
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

<div class="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
	<div class="mx-auto max-w-7xl px-8 py-12">
		<!-- Header -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold text-[var(--color-text)]">Admin Panel</h1>
				<p class="mt-2 text-[var(--color-textSecondary)]">
					Manage items and currencies
				</p>
			</div>
			<Button variant="primary" onclick={handleCreate} disabled={isLoading}>
				+ Create Item/Currency
			</Button>
		</div>

		<!-- Modal for Form -->
		<Modal bind:open={showForm} onClose={handleCancel} size="lg">
			<h2 class="mb-6 text-2xl font-semibold text-[var(--color-text)]">
				{editingItem ? 'Edit Item/Currency' : 'Create New Item/Currency'}
			</h2>
			{#if error}
				<div class="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
					{error}
				</div>
			{/if}
			<ItemCurrencyForm
				data={editingItem}
				mode={editingItem ? 'edit' : 'create'}
				onSubmit={handleSubmit}
				onCancel={handleCancel}
			/>
			{#if isLoading}
				<div class="absolute inset-0 flex items-center justify-center bg-black/20">
					<div class="text-[var(--color-text)]">Saving...</div>
				</div>
			{/if}
		</Modal>

		<!-- Items Section -->
		<div class="mb-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
			<div class="border-b border-[var(--color-border)] p-6">
				<h2 class="text-2xl font-semibold text-[var(--color-text)]">
					Items ({data.items?.length || 0})
				</h2>
			</div>

			{#if !data.items?.length}
				<div class="p-12 text-center">
					<p class="text-lg text-[var(--color-textSecondary)]">
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
									<p class="truncate text-sm font-semibold text-[var(--color-text)]">
										{item.name}
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => handleEdit(item)}
											disabled={isLoading}
											class="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
										>
											Edit
										</button>
										<button
											onclick={() => handleDelete(item)}
											disabled={isLoading}
											class="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50"
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
		<div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
			<div class="border-b border-[var(--color-border)] p-6">
				<h2 class="text-2xl font-semibold text-[var(--color-text)]">
					Currencies ({data.currencies?.length || 0})
				</h2>
			</div>

			{#if !data.currencies?.length}
				<div class="p-12 text-center">
					<p class="text-lg text-[var(--color-textSecondary)]">
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
									<p class="truncate text-sm font-semibold text-[var(--color-text)]">
										{currency.name}
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => handleEdit(currency)}
											disabled={isLoading}
											class="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
										>
											Edit
										</button>
										<button
											onclick={() => handleDelete(currency)}
											disabled={isLoading}
											class="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50"
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
