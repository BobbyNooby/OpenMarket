<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import PermissionGrid from './PermissionGrid.svelte';
	import { DEFAULT_ROLES, type RoleDetail, type Permission } from './admin-api';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		role: RoleDetail;
		permissions: Permission[];
		editName: string;
		editDescription: string;
		checkedPermissions: Set<string>;
		isSaving: boolean;
		hasChanges: boolean;
		error: string | null;
		onTogglePermission: (permId: string) => void;
		onSave: () => void;
		onDelete: () => void;
	}

	let {
		role,
		permissions,
		editName = $bindable(),
		editDescription = $bindable(),
		checkedPermissions,
		isSaving,
		hasChanges,
		error,
		onTogglePermission,
		onSave,
		onDelete
	}: Props = $props();

	const isDefault = $derived(DEFAULT_ROLES.includes(role.id));
</script>

<div class="space-y-6">
	{#if error}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
			{error}
		</div>
	{/if}

	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<h3 class="text-lg font-semibold text-foreground">{m.admin_role_editor_title()}</h3>
			{#if isDefault}
				<Badge variant="outline" class="text-xs">{m.admin_roles_default()}</Badge>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div class="space-y-2">
				<Label for="role-name">{m.admin_create_role_name()}</Label>
				<Input id="role-name" bind:value={editName} />
			</div>
			<div class="space-y-2">
				<Label for="role-id">{m.admin_role_editor_slug()}</Label>
				<Input id="role-id" value={role.id} disabled />
			</div>
		</div>
		<div class="space-y-2">
			<Label for="role-desc">{m.admin_create_role_description()}</Label>
			<Textarea id="role-desc" bind:value={editDescription} rows={2} />
		</div>
	</div>

	<Separator />

	<PermissionGrid
		{permissions}
		checked={checkedPermissions}
		onToggle={onTogglePermission}
	/>

	<Separator />

	<div class="flex items-center justify-between">
		<div>
			{#if !isDefault}
				<Button variant="destructive" size="sm" disabled={isSaving} onclick={onDelete}>
					{m.admin_role_editor_delete()}
				</Button>
			{/if}
		</div>
		<Button disabled={isSaving || !hasChanges} onclick={onSave}>
			{isSaving ? m.admin_role_editor_saving() : m.admin_role_editor_save()}
		</Button>
	</div>
</div>
