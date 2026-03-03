<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { apiJson } from './admin-api';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		onRoleCreated: (roleId: string) => void;
	}

	let { open = $bindable(), onRoleCreated }: Props = $props();

	let name = $state('');
	let description = $state('');
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	async function handleCreate() {
		if (!name.trim()) {
			error = 'Name is required';
			return;
		}

		isSaving = true;
		error = null;

		try {
			const result = await apiJson('/admin/roles', 'POST', {
				name: name.trim(),
				description: description.trim() || undefined
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to create role');
			}

			toast.success(`Role "${name.trim()}" created`);
			onRoleCreated(result.data.id);
			name = '';
			description = '';
			open = false;
		} catch (err: any) {
			toast.error(err.message || 'Failed to create role');
		} finally {
			isSaving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Create New Role</Dialog.Title>
			<Dialog.Description>
				Create a custom role with a unique name.
			</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label for="new-role-name">Name <span class="text-destructive">*</span></Label>
				<Input
					id="new-role-name"
					bind:value={name}
					placeholder="e.g. Content Manager"
				/>
				{#if name.trim()}
					<p class="text-xs text-muted-foreground">
						Slug: {name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
					</p>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="new-role-desc">Description</Label>
				<Textarea
					id="new-role-desc"
					bind:value={description}
					placeholder="Describe what this role is for..."
					rows={3}
				/>
			</div>
		</div>

		<div class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => open = false} disabled={isSaving}>
				Cancel
			</Button>
			<Button onclick={handleCreate} disabled={isSaving || !name.trim()}>
				{isSaving ? 'Creating...' : 'Create Role'}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
