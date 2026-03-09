<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { getAuditLogs, type AuditLogEntry } from './admin-api';

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
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function actionLabel(action: string): string {
		const labels: Record<string, string> = {
			'user.ban': 'Ban',
			'user.unban': 'Unban',
			'user.warn': 'Warning',
			'user.delete': 'Delete',
			'role.assign': 'Role Assigned',
			'role.remove': 'Role Removed',
			'report.resolve': 'Report Resolved',
		};
		return labels[action] ?? action;
	}

	function actionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (action === 'user.ban' || action === 'user.delete') return 'destructive';
		if (action === 'user.warn') return 'default';
		return 'outline';
	}

	function metadataSummary(entry: AuditLogEntry): string {
		if (!entry.metadata) return '';
		const m = entry.metadata;
		if (m.reason) return String(m.reason);
		if (m.role) return `Role: ${m.role}`;
		if (m.status) return `Status: ${m.status}`;
		if (m.deletedUserName) return `User: ${m.deletedUserName}`;
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
	<h3 class="text-lg font-semibold text-foreground">Audit Log</h3>

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
						: 'All actions'}
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
		<div class="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
	{:else if logs.length === 0}
		<div class="py-8 text-center text-muted-foreground">No audit log entries found.</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Action</Table.Head>
					<Table.Head>Actor</Table.Head>
					<Table.Head>Target</Table.Head>
					<Table.Head>Details</Table.Head>
					<Table.Head>Date</Table.Head>
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
								{metadataSummary(entry) || '—'}
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
			Showing {showingFrom}–{showingTo} of {total}
		</p>
		<div class="flex gap-2">
			<Button size="sm" variant="outline" disabled={offset === 0} onclick={prevPage}>
				Previous
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={offset + limit >= total}
				onclick={nextPage}
			>
				Next
			</Button>
		</div>
	</div>
</div>
