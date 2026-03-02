<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import LockIcon from '@lucide/svelte/icons/lock';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import { apiFetch, apiJson, DEFAULT_ROLES, type Role, type Permission, type RoleDetail } from './admin-api';

	const EVERYONE_ID = '@everyone';
	import RoleEditor from './RoleEditor.svelte';
	import CreateRoleDialog from './CreateRoleDialog.svelte';

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
			if (!updateResult.success) throw new Error(updateResult.error || 'Failed to update role');

			const permsResult = await apiJson(`/admin/roles/${selectedRoleId}/permissions`, 'PUT', {
				permissions: [...checkedPermissions]
			});
			if (!permsResult.success) throw new Error(permsResult.error || 'Failed to update permissions');

			await loadRoles();
			roleDetail = {
				...roleDetail,
				name: editName,
				description: editDescription,
				permissions: [...checkedPermissions]
			};
			onDataChanged();
		} catch (err: any) {
			error = err.message || 'An error occurred';
		} finally {
			isSaving = false;
		}
	}

	async function deleteRole() {
		if (!selectedRoleId) return;
		if (!confirm('Are you sure you want to delete this role? This cannot be undone.')) return;

		isSaving = true;
		error = null;

		try {
			const result = await apiFetch(`/admin/roles/${selectedRoleId}`, { method: 'DELETE' });
			if (!result.success) throw new Error(result.error || 'Failed to delete role');

			selectedRoleId = null;
			roleDetail = null;
			await loadRoles();
			onDataChanged();
		} catch (err: any) {
			error = err.message || 'An error occurred';
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
			+ Create Role
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
				Select a role to view and edit its details
			</div>
		{:else if selectedRoleId === EVERYONE_ID}
			<div class="space-y-6">
				<div class="space-y-2">
					<div class="flex items-center gap-3">
						<GlobeIcon class="size-5 text-muted-foreground" />
						<h3 class="text-lg font-semibold text-foreground">@everyone</h3>
					</div>
					<p class="text-sm text-muted-foreground">
						Base permissions for unauthenticated visitors. These apply to anyone browsing the site without an account.
					</p>
				</div>

				<div class="space-y-4 rounded-md border border-border p-4">
					<h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Public Access</h4>
					<ul class="space-y-2 text-sm text-foreground">
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-green-500"></span>
							Browse and search listings
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-green-500"></span>
							View item and currency details
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-green-500"></span>
							View user profiles and reviews
						</li>
					</ul>

					<h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Requires Login</h4>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-border"></span>
							Create or manage listings
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-border"></span>
							Leave reviews on profiles
						</li>
						<li class="flex items-center gap-2">
							<span class="size-1.5 rounded-full bg-border"></span>
							Contact sellers
						</li>
					</ul>
				</div>

				<p class="text-xs text-muted-foreground">
					This role is virtual and cannot be edited. Public access is controlled by route-level authentication.
				</p>
			</div>
		{:else if isLoading}
			<div class="flex h-full items-center justify-center text-muted-foreground">
				Loading...
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
