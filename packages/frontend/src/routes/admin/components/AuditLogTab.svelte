<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { getAuditLogs, type AuditLogEntry } from './admin-api';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		dataVersion: number;
	}

	let { dataVersion }: Props = $props();

	let logs = $state<AuditLogEntry[]>([]);
	let total = $state(0);
	let limit = $state(20);
	let offset = $state(0);
	let actionFilter = $state('');
	let loading = $state(false);

	const ACTION_OPTIONS = [
		{ value: '__all__', label: 'All actions' },
		{ value: 'user.ban', label: 'Ban' },
		{ value: 'user.unban', label: 'Unban' },
		{ value: 'user.warn', label: 'Warning' },
		{ value: 'user.delete', label: 'Delete user' },
		{ value: 'role.assign', label: 'Role assigned' },
		{ value: 'role.remove', label: 'Role removed' },
		{ value: 'report.resolve', label: 'Report resolved' },
	];

	async function loadLogs() {
		loading = true;
		const result = await getAuditLogs({
			limit,
			offset,
			action: actionFilter || undefined,
		});
		if (result.success) {
			logs = result.data;
			total = result.pagination.total;
		}
		loading = false;
	}

	function handleActionFilter(value: string) {
		actionFilter = value === '__all__' ? '' : value;
		offset = 0;
		loadLogs();
	}

	function prevPage() {
		if (offset > 0) {
			offset = Math.max(0, offset - limit);
			loadLogs();
		}
	}
	function nextPage() {
		if (offset + limit < total) {
			offset += limit;
			loadLogs();
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			'user.ban': m.admin_audit_action_ban(),
			'user.unban': m.admin_audit_action_unban(),
			'user.warn': m.admin_audit_action_warning(),
			'user.delete': m.admin_audit_action_delete(),
			'role.assign': m.admin_audit_action_role_assigned(),
			'role.remove': m.admin_audit_action_role_removed(),
			'report.resolve': m.admin_audit_action_report_resolved(),
			'site_config:update': 'Site Config Updated',
			'site_theme:update': 'Theme Updated',
			'site_theme:reset_variable': 'Theme Variable Reset',
			'site_theme:reset_variant': 'Theme Variant Reset',
			'media:delete': 'Media Deleted',
			'media:cleanup': 'Media Cleanup',
			'media:assign_asset': 'Asset Assigned',
			'media:clear_asset': 'Asset Cleared',
		};
		return labels[action] ?? action.replace(/[_:]/g, ' ');
	}

	function actionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (action === 'user.ban' || action === 'user.delete' || action === 'media:delete') return 'destructive';
		if (action === 'user.warn') return 'default';
		if (action.startsWith('site_config') || action.startsWith('site_theme') || action.startsWith('media')) return 'secondary';
		return 'outline';
	}

	function metadataSummary(entry: AuditLogEntry): string {
		if (!entry.metadata) return '';
		const md = entry.metadata;
		if (md.reason) return String(md.reason);
		if (md.role) return `Role: ${md.role}`;
		if (md.status) return `Status: ${md.status}`;
		if (md.deletedUserName) return `User: ${md.deletedUserName}`;
		if (md.keys) return `Keys: ${(md.keys as string[]).join(', ')}`;
		if (md.filename) return String(md.filename);
		if (md.deleted) return `${md.deleted} files removed`;
		if (md.upload_id) return `Upload: ${String(md.upload_id).slice(0, 8)}...`;
		if (md.variable) return String(md.variable);
		if (md.variant) return String(md.variant);
		return '';
	}

	$effect(() => {
		void dataVersion;
		loadLogs();
	});

	const showingFrom = $derived(total > 0 ? offset + 1 : 0);
	const showingTo = $derived(Math.min(offset + limit, total));
</script>

<div class="space-y-4">
	<h3 class="text-lg font-semibold text-foreground">{m.admin_audit_title()}</h3>

	<div class="flex items-center gap-4">
		<Select.Root
			type="single"
			value={actionFilter || '__all__'}
			onValueChange={handleActionFilter}
		>
			<Select.Trigger class="w-48">
				<span class={actionFilter ? '' : 'text-muted-foreground'}>
					{actionFilter
						? actionLabel(actionFilter)
						: m.admin_audit_all_actions()}
				</span>
			</Select.Trigger>
			<Select.Content>
				{#each ACTION_OPTIONS as opt}
					<Select.Item value={opt.value} label={opt.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12 text-muted-foreground">{m.common_loading()}</div>
	{:else if logs.length === 0}
		<div class="py-8 text-center text-muted-foreground">{m.admin_audit_no_logs()}</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>{m.admin_audit_column_action()}</Table.Head>
					<Table.Head>{m.admin_audit_column_actor()}</Table.Head>
					<Table.Head>{m.admin_audit_target()}</Table.Head>
					<Table.Head>{m.admin_audit_column_details()}</Table.Head>
					<Table.Head>{m.admin_audit_column_date()}</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each logs as entry}
					<Table.Row>
						<Table.Cell>
							<Badge variant={actionVariant(entry.action)}>
								{actionLabel(entry.action)}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								{#if entry.actor.image}
									<img
										src={entry.actor.image}
										alt={entry.actor.name}
										class="h-6 w-6 rounded-full"
									/>
								{/if}
								<a
									href="/profile/{entry.actor.username}"
									class="text-sm font-medium hover:text-primary"
								>
									@{entry.actor.username}
								</a>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if entry.target}
								<div class="flex items-center gap-2">
									{#if entry.target.image}
										<img
											src={entry.target.image}
											alt={entry.target.name}
											class="h-6 w-6 rounded-full"
										/>
									{/if}
									<a
										href="/profile/{entry.target.username}"
										class="text-sm font-medium hover:text-primary"
									>
										@{entry.target.username}
									</a>
								</div>
							{:else}
								<span class="text-xs text-muted-foreground italic">
									{entry.target_type}:{entry.target_id.slice(0, 8)}...
								</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<p class="max-w-60 truncate text-sm" title={metadataSummary(entry)}>
								{metadataSummary(entry) ||"—"}
							</p>
						</Table.Cell>
						<Table.Cell>
							<span class="text-sm text-muted-foreground">
								{formatDate(entry.created_at)}
							</span>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}

	<div class="flex items-center justify-between">
		<p class="text-sm text-muted-foreground">
			{m.admin_audit_showing({ from: showingFrom, to: showingTo, total })}
		</p>
		<div class="flex gap-2">
			<Button size="sm" variant="outline" disabled={offset === 0} onclick={prevPage}>
				{m.admin_audit_previous()}
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={offset + limit >= total}
				onclick={nextPage}
			>
				{m.admin_audit_next()}
			</Button>
		</div>
	</div>
</div>
