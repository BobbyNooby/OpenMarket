<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import {
		getReports,
		updateReportStatus,
		getModerationLog,
		type AdminReport,
		type ModerationEvent
	} from './admin-api';
	import ResolveReportDialog from './ResolveReportDialog.svelte';
	import { toast } from 'svelte-sonner';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Flag from '@lucide/svelte/icons/flag';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		dataVersion: number;
		onDataChanged: () => void;
	}

	let { dataVersion, onDataChanged }: Props = $props();

	let reports = $state<AdminReport[]>([]);
	let reportsTotal = $state(0);
	let reportsLimit = $state(20);
	let reportsOffset = $state(0);
	let statusFilter = $state('pending');
	let reportsLoading = $state(false);

	let selectedReport = $state<AdminReport | null>(null);
	let resolveDialogOpen = $state(false);

	function openResolveDialog(report: AdminReport) {
		selectedReport = report;
		resolveDialogOpen = true;
	}

	function handleResolved() {
		loadReports();
		loadLog();
		onDataChanged();
	}

	let logEvents = $state<ModerationEvent[]>([]);
	let logTotal = $state(0);
	let logLimit = $state(20);
	let logOffset = $state(0);
	let logTypeFilter = $state('');
	let logLoading = $state(false);

	async function loadReports() {
		reportsLoading = true;
		const result = await getReports({
			limit: reportsLimit,
			offset: reportsOffset,
			status: statusFilter || undefined
		});
		if (result.success) {
			reports = result.data;
			reportsTotal = result.pagination.total;
		}
		reportsLoading = false;
	}

	async function loadLog() {
		logLoading = true;
		const result = await getModerationLog({
			limit: logLimit,
			offset: logOffset,
			type: logTypeFilter || undefined
		});
		if (result.success) {
			logEvents = result.data;
			logTotal = result.pagination.total;
		}
		logLoading = false;
	}

	function handleStatusFilter(value: string) {
		statusFilter = value === '__all__' ? '' : value;
		reportsOffset = 0;
		loadReports();
	}

	function handleLogTypeFilter(value: string) {
		logTypeFilter = value === '__all__' ? '' : value;
		logOffset = 0;
		loadLog();
	}

	async function handleDismiss(report: AdminReport) {
		const result = await updateReportStatus(report.id, 'dismissed');
		if (result.success) {
			toast.success(m.admin_reports_dismiss_success());
			loadReports();
			loadLog();
			onDataChanged();
		} else {
			toast.error(result.error || m.admin_reports_dismiss_error());
		}
	}

	function reportsPrevPage() {
		if (reportsOffset > 0) {
			reportsOffset = Math.max(0, reportsOffset - reportsLimit);
			loadReports();
		}
	}
	function reportsNextPage() {
		if (reportsOffset + reportsLimit < reportsTotal) {
			reportsOffset += reportsLimit;
			loadReports();
		}
	}
	function logPrevPage() {
		if (logOffset > 0) {
			logOffset = Math.max(0, logOffset - logLimit);
			loadLog();
		}
	}
	function logNextPage() {
		if (logOffset + logLimit < logTotal) {
			logOffset += logLimit;
			loadLog();
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function targetLabel(report: AdminReport): string {
		if (report.target_type === 'listing') return m.admin_reports_type_listing();
		if (report.target_type === 'user') return m.admin_reports_type_user();
		return m.admin_reports_type_review();
	}

	$effect(() => {
		void dataVersion;
		loadReports();
		loadLog();
	});

	const reportsShowingFrom = $derived(reportsTotal > 0 ? reportsOffset + 1 : 0);
	const reportsShowingTo = $derived(Math.min(reportsOffset + reportsLimit, reportsTotal));
	const logShowingFrom = $derived(logTotal > 0 ? logOffset + 1 : 0);
	const logShowingTo = $derived(Math.min(logOffset + logLimit, logTotal));
</script>

<div class="space-y-8">
	<div class="space-y-4">
		<h3 class="text-lg font-semibold text-foreground">{m.admin_reports_user_reports()}</h3>

		<div class="flex items-center gap-4">
			<Select.Root
				type="single"
				value={statusFilter || '__all__'}
				onValueChange={handleStatusFilter}
			>
				<Select.Trigger class="w-48">
					<span class={statusFilter ? '' : 'text-muted-foreground'}>
						{statusFilter
							? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
							: m.admin_reports_filter_all()}
					</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="__all__" label={m.admin_reports_filter_all()} />
					<Select.Item value="pending" label={m.admin_reports_status_pending()} />
					<Select.Item value="resolved" label={m.admin_reports_status_resolved()} />
					<Select.Item value="dismissed" label={m.admin_reports_status_dismissed()} />
				</Select.Content>
			</Select.Root>
		</div>

		{#if reportsLoading}
			<div class="flex items-center justify-center py-12 text-muted-foreground">{m.common_loading()}</div>
		{:else if reports.length === 0}
			<div class="py-8 text-center text-muted-foreground">{m.admin_reports_no_reports()}</div>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{m.admin_reports_column_reporter()}</Table.Head>
						<Table.Head>{m.admin_reports_column_target()}</Table.Head>
						<Table.Head>{m.admin_reports_column_type()}</Table.Head>
						<Table.Head>{m.admin_reports_column_reason()}</Table.Head>
						<Table.Head>{m.admin_reports_column_reports()}</Table.Head>
						<Table.Head>{m.admin_reports_column_status()}</Table.Head>
						<Table.Head>{m.admin_reports_column_date()}</Table.Head>
						<Table.Head class="text-right">{m.admin_reports_column_actions()}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each reports as report}
						<Table.Row>
							<Table.Cell>
								<div class="flex items-center gap-2">
									{#if report.reporter.image}
										<img
											src={report.reporter.image}
											alt={report.reporter.name}
											class="h-6 w-6 rounded-full"
										/>
									{/if}
									<a
										href="/profile/{report.reporter.username}"
										class="text-sm font-medium hover:text-primary"
									>
										@{report.reporter.username}
									</a>
								</div>
							</Table.Cell>
							<Table.Cell>
								{#if report.target}
									<div class="flex items-center gap-2">
										{#if report.target.image}
											<img
												src={report.target.image}
												alt={report.target.name}
												class="h-6 w-6 rounded-full"
											/>
										{/if}
										<a
											href="/profile/{report.target.username}"
											class="text-sm font-medium hover:text-primary"
										>
											@{report.target.username}
										</a>
									</div>
								{:else}
									<span class="text-xs text-muted-foreground italic">{m.admin_reports_unknown()}</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline">{targetLabel(report)}</Badge>
							</Table.Cell>
							<Table.Cell>
								<p class="max-w-50 truncate text-sm" title={report.reason}>
									{report.reason}
								</p>
							</Table.Cell>
							<Table.Cell>
								{#if report.report_count > 1}
									<Badge variant="secondary">{report.report_count}</Badge>
								{:else}
									<span class="text-sm text-muted-foreground">1</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if report.status === 'pending'}
									<Badge class="bg-amber-500 text-white hover:bg-amber-500">{m.admin_reports_status_pending()}</Badge>
								{:else if report.status === 'resolved'}
									<Badge class="bg-green-500 text-white hover:bg-green-500">{m.admin_reports_status_resolved()}</Badge>
								{:else}
									<Badge variant="secondary">{m.admin_reports_status_dismissed()}</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<span class="text-sm text-muted-foreground">
									{formatDate(report.created_at)}
								</span>
							</Table.Cell>
							<Table.Cell class="text-right">
								{#if report.status === 'pending'}
									<div class="flex justify-end gap-1">
										<Button
											size="sm"
											variant="outline"
											class="h-8"
											onclick={() => openResolveDialog(report)}
											title={m.admin_reports_review()}
										>
											<Search class="mr-1 h-3.5 w-3.5" />
												{m.admin_reports_review()}
										</Button>
										<Button
											size="sm"
											variant="outline"
											class="h-8 text-muted-foreground hover:text-foreground"
											onclick={() => handleDismiss(report)}
											title={m.admin_reports_quick_dismiss()}
										>
											<X class="h-3.5 w-3.5" />
										</Button>
									</div>
								{:else if report.resolved_by}
									<span class="text-xs text-muted-foreground">
										{m.admin_reports_by({ user: `@${report.resolved_by.username ?? report.resolved_by.name}` })}
									</span>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}

		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				{m.admin_analytics_showing({ from: reportsShowingFrom, to: reportsShowingTo, total: reportsTotal })}
			</p>
			<div class="flex gap-2">
				<Button size="sm" variant="outline" disabled={reportsOffset === 0} onclick={reportsPrevPage}>
					{m.admin_audit_previous()}
				</Button>
				<Button
					size="sm"
					variant="outline"
					disabled={reportsOffset + reportsLimit >= reportsTotal}
					onclick={reportsNextPage}
				>
					{m.admin_audit_next()}
				</Button>
			</div>
		</div>
	</div>

	<Separator />

	<div class="space-y-4">
		<h3 class="text-lg font-semibold text-foreground">{m.admin_reports_moderation_log()}</h3>

		<div class="flex items-center gap-4">
			<Select.Root
				type="single"
				value={logTypeFilter || '__all__'}
				onValueChange={handleLogTypeFilter}
			>
				<Select.Trigger class="w-48">
					<span class={logTypeFilter ? '' : 'text-muted-foreground'}>
						{logTypeFilter
							? logTypeFilter.charAt(0).toUpperCase() + logTypeFilter.slice(1) + 's'
							: m.admin_reports_filter_events()}
					</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="__all__" label={m.admin_reports_filter_events()} />
					<Select.Item value="report" label={m.admin_reports_filter_reports()} />
					<Select.Item value="ban" label={m.admin_reports_filter_bans()} />
					<Select.Item value="warning" label={m.admin_reports_filter_warnings()} />
				</Select.Content>
			</Select.Root>
		</div>

		{#if logLoading}
			<div class="flex items-center justify-center py-12 text-muted-foreground">{m.common_loading()}</div>
		{:else if logEvents.length === 0}
			<div class="py-8 text-center text-muted-foreground">{m.admin_reports_no_events()}</div>
		{:else}
			<div class="space-y-3">
				{#each logEvents as event}
					<div class="rounded-md border border-border p-3">
						<div class="mb-2 flex items-center gap-2">
							{#if event.event_type === 'ban'}
								<ShieldAlert class="h-4 w-4 text-destructive" />
								<Badge variant="destructive">{m.admin_reports_event_ban()}</Badge>
							{:else if event.event_type === 'warning'}
								<TriangleAlert class="h-4 w-4 text-amber-500" />
								<Badge class="bg-amber-500 text-white hover:bg-amber-500">{m.admin_reports_event_warning()}</Badge>
							{:else}
								<Flag class="h-4 w-4 text-blue-500" />
								<Badge variant="outline">{m.admin_reports_event_report()}</Badge>
								{#if event.status}
									{#if event.status === 'pending'}
										<Badge class="bg-amber-500/20 text-amber-600">{m.admin_reports_status_pending()}</Badge>
									{:else if event.status === 'resolved'}
										<Badge class="bg-green-500/20 text-green-600">{m.admin_reports_status_resolved()}</Badge>
									{:else if event.status === 'dismissed'}
										<Badge variant="secondary">{m.admin_reports_status_dismissed()}</Badge>
									{/if}
								{/if}
							{/if}
						</div>

						{#if event.reason}
							<p class="mb-2 text-sm text-foreground">{event.reason}</p>
						{:else}
							<p class="mb-2 text-sm italic text-muted-foreground">{m.admin_reports_no_reason()}</p>
						{/if}

						<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
							<span>
								{m.admin_history_by({ name: '' })}
								<a href="/profile/{event.actor.username}" class="hover:text-primary">
									@{event.actor.username}
								</a>
							</span>
							{#if event.event_type !== 'report'}
								<span>
									{m.admin_resolve_report_target()}:
									<a href="/profile/{event.target_name}" class="hover:text-primary">
										@{event.target_name}
									</a>
								</span>
							{:else}
								<span>
									{m.admin_resolve_report_target()}: {event.target_type}
								</span>
							{/if}
							<span>{formatDate(event.created_at)}</span>
							{#if event.event_type === 'ban' && event.expires_at}
								<span>{m.admin_history_expires()}: {formatDate(event.expires_at)}</span>
							{:else if event.event_type === 'ban' && !event.expires_at}
								<span>{m.admin_history_permanent()}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				{m.admin_analytics_showing({ from: logShowingFrom, to: logShowingTo, total: logTotal })}
			</p>
			<div class="flex gap-2">
				<Button size="sm" variant="outline" disabled={logOffset === 0} onclick={logPrevPage}>
					{m.admin_audit_previous()}
				</Button>
				<Button
					size="sm"
					variant="outline"
					disabled={logOffset + logLimit >= logTotal}
					onclick={logNextPage}
				>
					{m.admin_audit_next()}
				</Button>
			</div>
		</div>
	</div>
</div>

{#if selectedReport}
	<ResolveReportDialog
		bind:open={resolveDialogOpen}
		report={selectedReport}
		onResolved={handleResolved}
	/>
{/if}
