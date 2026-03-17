<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { apiFetch, apiJson } from './admin-api';
	import { toast } from 'svelte-sonner';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import FolderOpen from '@lucide/svelte/icons/folder-open';

	interface Category {
		id: string;
		name: string;
		slug: string;
		icon_url: string | null;
		created_at: string;
	}

	interface Props {
		dataVersion: number;
		onDataChanged: () => void;
	}

	let { dataVersion, onDataChanged }: Props = $props();

	let categories = $state<Category[]>([]);
	let loading = $state(false);
	let showDialog = $state(false);
	let editingCategory = $state<Category | null>(null);

	// Form state
	let formName = $state('');
	let formIconUrl = $state('');
	let formError = $state('');
	let formLoading = $state(false);

	async function loadCategories() {
		loading = true;
		const result = await apiFetch('/categories');
		if (result.success) {
			categories = result.data;
		}
		loading = false;
	}

	$effect(() => {
		dataVersion;
		loadCategories();
	});

	function openCreate() {
		editingCategory = null;
		formName = '';
		formIconUrl = '';
		formError = '';
		showDialog = true;
	}

	function openEdit(cat: Category) {
		editingCategory = cat;
		formName = cat.name;
		formIconUrl = cat.icon_url || '';
		formError = '';
		showDialog = true;
	}

	async function handleSubmit() {
		if (!formName.trim()) {
			formError = 'Name is required';
			return;
		}

		formLoading = true;
		formError = '';

		try {
			const body: any = { name: formName.trim() };
			if (formIconUrl.trim()) body.icon_url = formIconUrl.trim();

			if (editingCategory) {
				const result = await apiJson(`/categories/${editingCategory.id}`, 'PUT', body);
				if (!result.success) throw new Error(result.error);
				toast.success(`"${formName}" updated`);
			} else {
				const result = await apiJson('/categories', 'POST', body);
				if (!result.success) throw new Error(result.error);
				toast.success(`"${formName}" created`);
			}

			showDialog = false;
			onDataChanged();
			await loadCategories();
		} catch (err: any) {
			formError = err.message || 'An error occurred';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	async function handleDelete(cat: Category) {
		if (!confirm(`Delete "${cat.name}"? Items in this category will become uncategorized.`)) return;

		try {
			const result = await apiJson(`/categories/${cat.id}`, 'DELETE');
			if (!result.success) throw new Error(result.error);
			toast.success(`"${cat.name}" deleted`);
			onDataChanged();
			await loadCategories();
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete category');
		}
	}
</script>

<div class="flex items-center justify-between mb-6">
	<p class="text-muted-foreground">Manage item categories</p>
	<Button onclick={openCreate}>+ Create Category</Button>
</div>

<!-- Create/Edit Dialog -->
<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>
				{editingCategory ? 'Edit Category' : 'Create Category'}
			</Dialog.Title>
		</Dialog.Header>

		{#if formError}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{formError}
			</div>
		{/if}

		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="cat-name">Name</Label>
				<Input id="cat-name" bind:value={formName} placeholder="e.g. Weapons, Armor, Resources" />
			</div>
			<div class="space-y-2">
				<Label for="cat-icon">Icon URL (optional)</Label>
				<Input id="cat-icon" bind:value={formIconUrl} placeholder="https://..." />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDialog = false)} disabled={formLoading}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={formLoading}>
				{formLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Categories List -->
<div class="rounded-lg border border-border bg-card shadow-md">
	<div class="border-b border-border p-6">
		<h2 class="text-2xl font-semibold text-foreground">
			Categories ({categories.length})
		</h2>
	</div>

	{#if loading}
		<div class="p-12 text-center text-muted-foreground">Loading...</div>
	{:else if categories.length === 0}
		<div class="p-12 text-center">
			<FolderOpen class="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
			<p class="text-lg text-muted-foreground">
				No categories yet. Create one to organize items.
			</p>
		</div>
	{:else}
		<div class="divide-y divide-border">
			{#each categories as cat}
				<div class="flex items-center justify-between px-6 py-4">
					<div class="flex items-center gap-3">
						{#if cat.icon_url}
							<img src={cat.icon_url} alt="" class="h-8 w-8 rounded object-cover" />
						{:else}
							<div class="flex h-8 w-8 items-center justify-center rounded bg-muted">
								<FolderOpen class="h-4 w-4 text-muted-foreground" />
							</div>
						{/if}
						<div>
							<p class="font-medium text-foreground">{cat.name}</p>
							<p class="text-xs text-muted-foreground">/{cat.slug}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Button variant="ghost" size="sm" onclick={() => openEdit(cat)}>
							<Pencil class="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="sm" onclick={() => handleDelete(cat)}>
							<Trash2 class="h-4 w-4 text-destructive" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
