<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { apiJson } from './admin-api';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';

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
			error = m.admin_create_role_name_required();
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
				throw new Error(result.error || m.admin_create_role_error());
			}

			toast.success(m.admin_create_role_success({ name: name.trim() }));
			onRoleCreated(result.data.id);
			name = '';
			description = '';
			open = false;
		} catch (err: any) {
			toast.error(err.message || m.admin_create_role_error());
		} finally {
			isSaving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.admin_create_role_title()}</Dialog.Title>
			<Dialog.Description>{m.admin_create_role_subtitle()}</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label for="new-role-name">{m.admin_create_role_name()} <span class="text-destructive">*</span></Label>
				<Input
					id="new-role-name"
					bind:value={name}
					placeholder={m.admin_create_role_name_placeholder()}
				/>
				{#if name.trim()}
					<p class="text-xs text-muted-foreground">
						{m.admin_create_role_slug()}: {name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
					</p>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="new-role-desc">{m.admin_create_role_description()}</Label>
				<Textarea
					id="new-role-desc"
					bind:value={description}
					placeholder={m.admin_create_role_description_placeholder()}
					rows={3}
				/>
			</div>
		</div>

		<div class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => open = false} disabled={isSaving}>
				{m.button_cancel()}
			</Button>
			<Button onclick={handleCreate} disabled={isSaving || !name.trim()}>
				{isSaving ? m.admin_create_role_creating() : m.admin_create_role_button()}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
