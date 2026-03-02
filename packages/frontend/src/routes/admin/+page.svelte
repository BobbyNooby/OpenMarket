<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import ItemsCurrenciesTab from './components/ItemsCurrenciesTab.svelte';
	import UsersTab from './components/UsersTab.svelte';
	import RolesTab from './components/RolesTab.svelte';
	import ReportsTab from './components/ReportsTab.svelte';

	let { data } = $props();

	let dataVersion = $state(0);
	function onDataChanged() {
		dataVersion++;
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-8 py-12">
		<h1 class="mb-8 text-4xl font-bold text-foreground">Admin Panel</h1>

		<Tabs.Root value="items">
			<Tabs.List>
				<Tabs.Trigger value="items">Items & Currencies</Tabs.Trigger>
				<Tabs.Trigger value="users">Users</Tabs.Trigger>
				<Tabs.Trigger value="roles">Roles</Tabs.Trigger>
				<Tabs.Trigger value="reports">Reports</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="items" class="mt-6">
				<ItemsCurrenciesTab {data} />
			</Tabs.Content>

			<Tabs.Content value="users" class="mt-6">
				<UsersTab {dataVersion} {onDataChanged} />
			</Tabs.Content>

			<Tabs.Content value="roles" class="mt-6">
				<RolesTab {dataVersion} {onDataChanged} />
			</Tabs.Content>

			<Tabs.Content value="reports" class="mt-6">
				<ReportsTab {dataVersion} {onDataChanged} />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>
