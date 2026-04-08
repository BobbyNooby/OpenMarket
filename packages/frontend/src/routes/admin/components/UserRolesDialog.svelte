<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { apiFetch, apiJson, type AdminUser, type Role } from './admin-api';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		user: AdminUser;
		allRoles: Role[];
		onRolesChanged: () => void;
	}

	let { open = $bindable(), user, allRoles, onRolesChanged }: Props = $props();

	let userRoles = $state<string[]>([]);
	let saving = $state<string | null>(null);
	let error = $state<string | null>(null);

	$effect(() => {
		if (open) {
			userRoles = [...user.roles];
		}
	});

	async function toggleRole(roleId: string, hasRole: boolean) {
		saving = roleId;
		error = null;

		try {
			const roleName = allRoles.find((r) => r.id === roleId)?.name ?? roleId;
			if (hasRole) {
				await apiFetch(`/admin/users/${user.id}/roles/${roleId}`, { method: 'DELETE' });
				userRoles = userRoles.filter((r) => r !== roleId);
				toast.success(m.admin_manage_roles_removed({ role: roleName, user: `@${user.username}` }));
			} else {
				await apiJson(`/admin/users/${user.id}/roles`, 'POST', { role: roleId });
				userRoles = [...userRoles, roleId];
				toast.success(m.admin_manage_roles_added({ role: roleName, user: `@${user.username}` }));
			}
			onRolesChanged();
		} catch (err: any) {
			toast.error(err.message || 'Failed to update role');
		} finally {
			saving = null;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.admin_manage_roles_title()}</Dialog.Title>
			<Dialog.Description>
					{m.admin_manage_roles_description({ user: `@${user.username}` })}
			</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<div class="space-y-3 py-2">
			{#each allRoles as role}
				{@const hasRole = userRoles.includes(role.id)}
				<div class="flex items-start gap-3 rounded-md border border-border p-3">
					<Checkbox
						checked={hasRole}
						disabled={saving !== null}
						onCheckedChange={() => toggleRole(role.id, hasRole)}
					/>
					<div class="flex-1 space-y-1">
						<Label class="flex items-center gap-2 text-sm font-medium">
							{role.name}
							{#if hasRole}
								<Badge variant="default" class="text-xs">{m.admin_manage_roles_active()}</Badge>
							{/if}
						</Label>
						{#if role.description}
							<p class="text-xs text-muted-foreground">{role.description}</p>
						{/if}
					</div>
					{#if saving === role.id}
						<span class="text-xs text-muted-foreground">{m.admin_manage_roles_saving()}</span>
					{/if}
				</div>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
