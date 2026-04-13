<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { getUserHistory, type AdminUser, type BanHistoryEntry, type WarningHistoryEntry } from './admin-api';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		user: AdminUser;
	}

	let { open = $bindable(), user }: Props = $props();

	let bans = $state<BanHistoryEntry[]>([]);
	let warnings = $state<WarningHistoryEntry[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	type TimelineEntry =
		| (BanHistoryEntry & { sortDate: string })
		| (WarningHistoryEntry & { sortDate: string });

	const timeline = $derived.by<TimelineEntry[]>(() => {
		const entries: TimelineEntry[] = [
			...bans.map((b) => ({ ...b, sortDate: b.bannedAt })),
			...warnings.map((w) => ({ ...w, sortDate: w.createdAt }))
		];
		entries.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
		return entries;
	});

	$effect(() => {
		if (open) {
			loadHistory();
		}
	});

	async function loadHistory() {
		loading = true;
		error = null;

		try {
			const result = await getUserHistory(user.id);
			if (!result.success || !result.data) {
				throw new Error('Failed to load history');
			}
			bans = result.data.bans;
			warnings = result.data.warnings;
		} catch (err: any) {
			error = err.message || 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{m.admin_history_title()}</Dialog.Title>
			<Dialog.Description>{m.admin_history_description({ user: `@${user.username}` })}</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-8 text-muted-foreground">{m.common_loading()}</div>
		{:else if timeline.length === 0}
			<div class="py-8 text-center text-muted-foreground">{m.admin_history_empty()}</div>
		{:else}
			<div class="space-y-3 py-2">
				{#each timeline as entry}
					<div class="rounded-md border border-border p-3">
						<div class="mb-2 flex items-center gap-2">
							{#if entry.type === 'ban'}
								<ShieldAlert class="h-4 w-4 text-destructive" />
								<Badge variant={entry.isActive ? 'destructive' : 'secondary'}>
									{entry.isActive ? m.admin_history_ban_active() : m.admin_history_ban_expired()}
								</Badge>
							{:else}
								<TriangleAlert class="h-4 w-4 text-amber-500" />
								<Badge variant="outline">{m.admin_history_warning()}</Badge>
							{/if}
						</div>

						{#if entry.reason}
							<p class="mb-2 text-sm text-foreground">{entry.reason}</p>
						{:else}
							<p class="mb-2 text-sm italic text-muted-foreground">{m.admin_history_no_reason()}</p>
						{/if}

						<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
							<span>
								{m.admin_history_by({ name: entry.issuedBy.name })}
							</span>
							{#if entry.type === 'ban'}
								<span>{m.admin_history_banned()}: {formatDate(entry.bannedAt)}</span>
								{#if entry.expiresAt}
									<span>{m.admin_history_expires()}: {formatDate(entry.expiresAt)}</span>
								{:else}
									<span>{m.admin_history_permanent()}</span>
								{/if}
							{:else}
								<span>{formatDate(entry.createdAt)}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
