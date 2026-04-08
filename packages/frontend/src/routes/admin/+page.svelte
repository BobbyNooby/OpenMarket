<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import ItemsCurrenciesTab from './components/ItemsCurrenciesTab.svelte';
	import UsersTab from './components/UsersTab.svelte';
	import RolesTab from './components/RolesTab.svelte';
	import ReportsTab from './components/ReportsTab.svelte';
	import AuditLogTab from './components/AuditLogTab.svelte';
	import CategoriesTab from './components/CategoriesTab.svelte';
	import AnalyticsTab from './components/AnalyticsTab.svelte';
	import SiteConfigTab from './components/SiteConfigTab.svelte';
	import ThemeTab from './components/ThemeTab.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	let dataVersion = $state(0);
	function onDataChanged() {
		dataVersion++;
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<div class="mx-auto max-w-7xl px-8 py-12">
		<h1 class="mb-8 text-4xl font-bold text-foreground">{m.admin_panel_title()}</h1>

		<Tabs.Root value="items">
			<Tabs.List>
				<Tabs.Trigger value="items">{m.admin_tab_items()}</Tabs.Trigger>
				<Tabs.Trigger value="categories">{m.admin_tab_categories()}</Tabs.Trigger>
				<Tabs.Trigger value="users">{m.admin_tab_users()}</Tabs.Trigger>
				<Tabs.Trigger value="roles">{m.admin_tab_roles()}</Tabs.Trigger>
				<Tabs.Trigger value="reports">{m.admin_tab_reports()}</Tabs.Trigger>
				<Tabs.Trigger value="audit">{m.admin_tab_audit()}</Tabs.Trigger>
				<Tabs.Trigger value="analytics">{m.admin_tab_analytics()}</Tabs.Trigger>
				<Tabs.Trigger value="site-config">{m.admin_tab_site_config()}</Tabs.Trigger>
				<Tabs.Trigger value="theme">{m.admin_tab_theme()}</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="items" class="mt-6">
				<ItemsCurrenciesTab {data} />
			</Tabs.Content>

			<Tabs.Content value="categories" class="mt-6">
				<CategoriesTab {dataVersion} {onDataChanged} />
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

			<Tabs.Content value="audit" class="mt-6">
				<AuditLogTab {dataVersion} />
			</Tabs.Content>

			<Tabs.Content value="analytics" class="mt-6">
				<AnalyticsTab {dataVersion} />
			</Tabs.Content>

			<Tabs.Content value="site-config" class="mt-6">
				<SiteConfigTab />
			</Tabs.Content>

			<Tabs.Content value="theme" class="mt-6">
				<ThemeTab />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>
