<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { updateReportStatus, banUser, warnUser, type AdminReport } from './admin-api';
	import { toast } from 'svelte-sonner';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		report: AdminReport;
		onResolved: () => void;
	}

	let { open = $bindable(), report, onResolved }: Props = $props();

	type Action = 'dismiss' | 'resolve' | 'warn-target' | 'ban-target' | 'warn-reporter' | 'ban-reporter';

	let action = $state<Action>('resolve');
	let reason = $state('');
	let isPermanent = $state(true);
	let expiresAt = $state('');
	let saving = $state(false);

	const isBanAction = $derived(action === 'ban-target' || action === 'ban-reporter');
	const isWarnAction = $derived(action === 'warn-target' || action === 'warn-reporter');
	const needsReason = $derived(isBanAction || isWarnAction);
	const canSubmit = $derived(!needsReason || reason.trim().length > 0);

	const reportStatus = $derived<'resolved' | 'dismissed'>(action === 'dismiss' ? 'dismissed' : 'resolved');

	function resetForm() {
		action = 'resolve';
		reason = '';
		isPermanent = true;
		expiresAt = '';
	}

	async function handleSubmit() {
		if (!canSubmit) return;

		saving = true;

		try {
			const targetUserId = (action === 'warn-target' || action === 'ban-target')
				? report.target?.id
				: (action === 'warn-reporter' ||action === 'ban-reporter')
					? report.reporter.id
					: null;

			if (targetUserId && isWarnAction) {
				const result = await warnUser(targetUserId, reason.trim());
				if (!result.success) {
					throw new Error(result.error || 'Failed to warn user');
				}
			}

			if (targetUserId && isBanAction) {
				const result = await banUser(
					targetUserId,
					reason.trim(),
					isPermanent ? undefined : expiresAt || undefined
				);
				if (!result.success) {
					throw new Error(result.error || 'Failed to ban user');
				}
			}

			const statusResult = await updateReportStatus(report.id, reportStatus);
			if (!statusResult.success) {
				throw new Error(statusResult.error || 'Failed to update report status');
			}

			const statusText = action === 'dismiss' ? 'dismissed' : 'resolved';
			toast.success(m.admin_resolve_report_success({ status: statusText }));
			onResolved();
			resetForm();
			open = false;
		} catch (err: any) {
			toast.error(err.message || 'Failed to process report');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) resetForm(); }}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{m.admin_resolve_report_title()}</Dialog.Title>
			<Dialog.Description>{m.admin_resolve_report_description()}</Dialog.Description>
		</Dialog.Header>

		<div class="rounded-md border border-border bg-muted/30 p-4 space-y-2">
			<div class="flex items-center gap-2 text-sm">
				<span class="text-muted-foreground">{m.admin_resolve_report_reporter()}:</span>
				<span class="font-medium">@{report.reporter.username}</span>
				<ArrowRight class="h-3.5 w-3.5 text-muted-foreground" />
				<span class="text-muted-foreground">{m.admin_resolve_report_target()}:</span>
				{#if report.target}
					<span class="font-medium">@{report.target.username}</span>
				{:else}
					<span class="text-muted-foreground italic">{report.target_type} #{report.target_id.slice(0, 8)}</span>
				{/if}
				<Badge variant="outline" class="ml-auto text-xs">{report.target_type}</Badge>
			</div>
			<p class="text-sm text-foreground">{report.reason}</p>
			{#if report.report_count > 1}
				<p class="text-xs text-muted-foreground">{m.admin_resolve_report_total({ count: report.report_count })}</p>
			{/if}
		</div>

		<div class="space-y-3 py-2">
			<Label class="text-sm font-medium">{m.admin_resolve_report_action()}</Label>
			<RadioGroup.Root bind:value={action}>
				<div class="flex items-center gap-2">
					<RadioGroup.Item value="dismiss" id="action-dismiss" />
					<Label for="action-dismiss" class="text-sm font-normal">{m.admin_resolve_report_dismiss()}</Label>
				</div>
				<div class="flex items-center gap-2">
					<RadioGroup.Item value="resolve" id="action-resolve" />
					<Label for="action-resolve" class="text-sm font-normal">{m.admin_resolve_report_resolve()}</Label>
				</div>

				{#if report.target}
					<div class="border-t border-border pt-2 mt-2">
						<p class="text-xs text-muted-foreground mb-2">{m.admin_resolve_report_action_against_target({ user: `@${report.target.username}` })}</p>
						<div class="grid gap-3">
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="warn-target" id="action-warn-target" />
								<Label for="action-warn-target" class="text-sm font-normal">{m.admin_resolve_report_warn_target()}</Label>
							</div>
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="ban-target" id="action-ban-target" />
								<Label for="action-ban-target" class="text-sm font-normal text-destructive">{m.admin_resolve_report_ban_target()}</Label>
							</div>
						</div>
					</div>
				{/if}

				<div class="border-t border-border pt-2 mt-2">
					<p class="text-xs text-muted-foreground mb-2">{m.admin_resolve_report_action_against_reporter({ user: `@${report.reporter.username}` })}</p>
					<div class="grid gap-3">
						<div class="flex items-center gap-2">
							<RadioGroup.Item value="warn-reporter" id="action-warn-reporter" />
							<Label for="action-warn-reporter" class="text-sm font-normal">{m.admin_resolve_report_warn_reporter()}</Label>
						</div>
						<div class="flex items-center gap-2">
							<RadioGroup.Item value="ban-reporter" id="action-ban-reporter" />
							<Label for="action-ban-reporter" class="text-sm font-normal text-destructive">{m.admin_resolve_report_ban_reporter()}</Label>
						</div>
					</div>
				</div>
			</RadioGroup.Root>
		</div>

		{#if needsReason}
			<div class="space-y-4 border-t border-border pt-4">
				<div class="space-y-2">
					<Label>{m.admin_resolve_report_reason()} <span class="text-destructive">*</span></Label>
					<Textarea bind:value={reason} placeholder={m.admin_resolve_report_reason_placeholder()} rows={3} />
				</div>

				{#if isBanAction}
					<div class="flex items-center gap-2">
						<Checkbox
							checked={isPermanent}
							onCheckedChange={(v) => { isPermanent = !!v; }}
						/>
						<Label class="text-sm">{m.admin_ban_permanent()}</Label>
					</div>

					{#if !isPermanent}
						<div class="space-y-2">
							<Label>{m.admin_ban_expires()}</Label>
							<Input type="datetime-local" bind:value={expiresAt} />
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => { open = false; }} disabled={saving}>
				{m.button_cancel()}
			</Button>
			<Button
				variant={isBanAction ? 'destructive' : 'default'}
				onclick={handleSubmit}
				disabled={saving || !canSubmit}
			>
				{#if saving}
					{m.admin_resolve_report_processing()}
				{:else if isBanAction}
					{m.admin_resolve_report_ban_button()}
				{:else if isWarnAction}
					{m.admin_resolve_report_warn_button()}
				{:else if action === 'dismiss'}
					{m.admin_resolve_report_dismiss_button()}
				{:else}
					{m.admin_resolve_report_resolve_button()}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
