<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import LockIcon from '@lucide/svelte/icons/lock';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import { apiFetch, apiJson, DEFAULT_ROLES, type Role, type Permission, type RoleDetail } from './admin-api';
	import { toast } from 'svelte-sonner';

	const EVERYONE_ID = '@everyone';
	import RoleEditor from './RoleEditor.svelte';
	import CreateRoleDialog from './CreateRoleDialog.svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		dataVersion: number;
		onDataChanged: () => void;
	}

	let { dataVersion, onDataChanged }: Props = $props();

	let roles = $state<Role[]>([]);
	let permissions = $state<Permission[]>([]);
	let selectedRoleId = $state<string | null>(null);
	let roleDetail = $state<RoleDetail | null>(null);

	let editName = $state('');
	let editDescription = $state('');
	let checkedPermissions = $state<Set<string>>(new Set());

	let isLoading = $state(false);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let createDialogOpen = $state(false);

	async function loadRoles() {
		const result = await apiFetch('/admin/roles');
		if (result.success) roles = result.data;
	}

	async function loadPermissions() {
		const result = await apiFetch('/admin/permissions');
		if (result.success) permissions = result.data;
	}

	function selectEveryone() {
		selectedRoleId = EVERYONE_ID;
		roleDetail = null;
		error = null;
	}

	async function selectRole(roleId: string) {
		if (roleId === EVERYONE_ID) return selectEveryone();

		selectedRoleId = roleId;
		isLoading = true;
		error = null;

		const result = await apiFetch(`/admin/roles/${roleId}`);
		if (result.success) {
			roleDetail = result.data;
			editName = result.data.name;
			editDescription = result.data.description || '';
			checkedPermissions = new Set(result.data.permissions);
		}
		isLoading = false;
	}

	async function saveRole() {
		if (!selectedRoleId || !roleDetail) return;

		isSaving = true;
		error = null;

		try {
			const updateResult = await apiJson(`/admin/roles/${selectedRoleId}`, 'PUT', {
				name: editName,
				description: editDescription
			});
			if (!updateResult.success) throw new Error(updateResult.error || m.admin_role_save_error());

			const permsResult = await apiJson(`/admin/roles/${selectedRoleId}/permissions`, 'PUT', {
				permissions: [...checkedPermissions]
			});
			if (!permsResult.success) throw new Error(permsResult.error || m.admin_role_save_error());

			await loadRoles();
			roleDetail = {
				...roleDetail,
				name: editName,
				description: editDescription,
				permissions: [...checkedPermissions]
			};
			toast.success(m.admin_role_saved());
			onDataChanged();
		} catch (err: any) {
			toast.error(err.message || m.admin_role_save_error());
		} finally {
			isSaving = false;
		}
	}

	async function deleteRole() {
		if (!selectedRoleId) return;
		if (!confirm(m.admin_role_delete_confirm())) return;

		isSaving = true;
		error = null;

		try {
			const result = await apiFetch(`/admin/roles/${selectedRoleId}`, { method: 'DELETE' });
			if (!result.success) throw new Error(result.error || m.admin_role_delete_error());

			selectedRoleId = null;
			roleDetail = null;
			await loadRoles();
			toast.success(m.admin_role_deleted());
			onDataChanged();
		} catch (err: any) {
			toast.error(err.message || m.admin_role_delete_error());
		} finally {
			isSaving = false;
		}
	}

	function togglePermission(permId: string) {
		const next = new Set(checkedPermissions);
		if (next.has(permId)) next.delete(permId);
		else next.add(permId);
		checkedPermissions = next;
	}

	async function onRoleCreated(roleId: string) {
		await loadRoles();
		selectRole(roleId);
		onDataChanged();
	}

	$effect(() => {
		void dataVersion;
		loadRoles();
		loadPermissions();
	});

	const hasChanges = $derived(() => {
		if (!roleDetail) return false;
		if (editName !== roleDetail.name) return true;
		if (editDescription !== (roleDetail.description || '')) return true;
		const original = new Set(roleDetail.permissions);
		if (checkedPermissions.size !== original.size) return true;
		for (const p of checkedPermissions) {
			if (!original.has(p)) return true;
		}
		return false;
	});
</script>

<div class="flex gap-6 min-h-[500px]">
	<!-- Left Panel: Role List -->
	<div class="w-64 shrink-0 space-y-3">
		<Button class="w-full" onclick={() => createDialogOpen = true}>
			+ {m.admin_roles_create()}
		</Button>

		<div class="space-y-1">
			<!-- @everyone pseudo-role -->
			<button
				onclick={selectEveryone}
				class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors {selectedRoleId === EVERYONE_ID ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}"
			>
				<span class="flex items-center gap-2">
					<GlobeIcon class="size-3.5 shrink-0" />
					@everyone
				</span>
				<LockIcon class="ml-2 size-3.5 shrink-0 opacity-60" />
			</button>

			{#each roles as role}
				<button
					onclick={() => selectRole(role.id)}
					class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors {selectedRoleId === role.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}"
				>
					<span class="truncate">{role.name}</span>
					{#if DEFAULT_ROLES.includes(role.id)}
						<LockIcon class="ml-2 size-3.5 shrink-0 opacity-60" />
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Right Panel -->
	<div class="flex-1 rounded-lg border border-border p-6">
		{#if !selectedRoleId}
			<div class="flex h-full items-center justify-center text-muted-foreground">
				{m.admin_roles_select_prompt()}
			</div>
		{:else if selectedRoleId === EVERYONE_ID}
			<div class="space-y-6">
				<div class="space-y-2">
					<div class="flex items-center gap-3">
						<GlobeIcon class="size-5 text-muted-foreground" />
						<h3 class="text-lg font-semibold text-foreground">@everyone</h3>
					</div>
					<p class="text-sm text-muted-foreground">
						{m.admin_roles_everyone_description()}
					</p>
				</div>

				<div class="space-y-4 rounded-md border border-border p-4">
					<h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{m.admin_roles_everyone_public_access_title()}</h4>
					<ul class="space-y-2 text-sm text-foreground">
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-green-500"></span>
							{m.admin_roles_everyone_browse_listings()}
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-green-500"></span>
							{m.admin_roles_everyone_view_items()}
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-green-500"></span>
							{m.admin_roles_everyone_view_profiles()}
						</li>
					</ul>

					<h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">{m.admin_roles_everyone_requires_login_title()}</h4>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-border"></span>
							{m.admin_roles_everyone_create_listings()}
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-border"></span>
							{m.admin_roles_everyone_leave_reviews()}
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-border"></span>
							{m.admin_roles_everyone_contact_sellers()}
						</li>
					</ul>
				</div>

				<p class="text-xs text-muted-foreground">
					{m.admin_roles_everyone_footer()}
				</p>
			</div>
		{:else if isLoading}
			<div class="flex h-full items-center justify-center text-muted-foreground">
				{m.common_loading()}
			</div>
		{:else if roleDetail}
			<RoleEditor
				role={roleDetail}
				{permissions}
				bind:editName
				bind:editDescription
				{checkedPermissions}
				{isSaving}
				hasChanges={hasChanges()}
				{error}
				onTogglePermission={togglePermission}
				onSave={saveRole}
				onDelete={deleteRole}
			/>
		{/if}
	</div>
</div>

<CreateRoleDialog bind:open={createDialogOpen} {onRoleCreated} />
