<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { apiFetch, type AdminUser, type Role } from './admin-api';
	import UserTable from './UserTable.svelte';
	import UserRolesDialog from './UserRolesDialog.svelte';

	let users = $state<AdminUser[]>([]);
	let roles = $state<Role[]>([]);
	let total = $state(0);
	let limit = $state(20);
	let offset = $state(0);
	let search = $state('');
	let roleFilter = $state('');
	let isLoading = $state(false);

	let rolesDialogOpen = $state(false);
	let selectedUser = $state<AdminUser | null>(null);

	let searchTimeout: ReturnType<typeof setTimeout>;

	async function loadRoles() {
		const result = await apiFetch('/admin/roles');
		if (result.success) roles = result.data;
	}

	async function loadUsers() {
		isLoading = true;
		const params = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString()
		});
		if (search) params.set('search', search);
		if (roleFilter) params.set('role', roleFilter);

		const result = await apiFetch(`/admin/users?${params}`);
		if (result.success) {
			users = result.data;
			total = result.pagination.total;
		}
		isLoading = false;
	}

	function handleSearch(e: Event) {
		clearTimeout(searchTimeout);
		const value = (e.target as HTMLInputElement).value;
		searchTimeout = setTimeout(() => {
			search = value;
			offset = 0;
			loadUsers();
		}, 300);
	}

	function handleRoleFilter(value: string) {
		roleFilter = value === '__all__' ? '' : value;
		offset = 0;
		loadUsers();
	}

	function prevPage() {
		if (offset > 0) {
			offset = Math.max(0, offset - limit);
			loadUsers();
		}
	}

	function nextPage() {
		if (offset + limit < total) {
			offset += limit;
			loadUsers();
		}
	}

	function openManageRoles(user: AdminUser) {
		selectedUser = user;
		rolesDialogOpen = true;
	}

	$effect(() => {
		loadRoles();
		loadUsers();
	});

	const showingFrom = $derived(total > 0 ? offset + 1 : 0);
	const showingTo = $derived(Math.min(offset + limit, total));
</script>

<div class="space-y-4">
	<!-- Filters -->
	<div class="flex items-center gap-4">
		<Input
			placeholder="Search users..."
			oninput={handleSearch}
			class="max-w-sm"
		/>
		<Select.Root
			type="single"
			value={roleFilter || '__all__'}
			onValueChange={handleRoleFilter}
		>
			<Select.Trigger class="w-48">
				<span class={roleFilter ? '' : 'text-muted-foreground'}>
					{roleFilter ? roles.find(r => r.id === roleFilter)?.name ?? 'Filter by role' : 'All roles'}
				</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="__all__" label="All roles" />
				{#each roles as role}
					<Select.Item value={role.id} label={role.name} />
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<UserTable
		{users}
		{isLoading}
		onManageRoles={openManageRoles}
	/>

	<!-- Pagination -->
	<div class="flex items-center justify-between">
		<p class="text-sm text-muted-foreground">
			Showing {showingFrom}–{showingTo} of {total}
		</p>
		<div class="flex gap-2">
			<Button size="sm" variant="outline" disabled={offset === 0} onclick={prevPage}>
				Previous
			</Button>
			<Button size="sm" variant="outline" disabled={offset + limit >= total} onclick={nextPage}>
				Next
			</Button>
		</div>
	</div>
</div>

{#if selectedUser}
	<UserRolesDialog
		bind:open={rolesDialogOpen}
		user={selectedUser}
		allRoles={roles}
		onRolesChanged={loadUsers}
	/>
{/if}
