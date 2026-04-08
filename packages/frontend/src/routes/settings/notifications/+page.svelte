<script lang="ts">
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import Loader2 from '@lucide/svelte/icons/loader';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	type NotificationKey =
		| 'new_review'
		| 'listing_expired'
		| 'role_changed'
		| 'warning_received'
		| 'report_resolved';

	const NOTIFICATION_KEYS: NotificationKey[] = [
		'new_review',
		'listing_expired',
		'role_changed',
		'warning_received',
		'report_resolved',
	];

	function notifLabel(key: NotificationKey): string {
		switch (key) {
			case 'new_review': return m.settings_notifications_new_review();
			case 'listing_expired': return m.settings_notifications_listing_expired();
			case 'role_changed': return m.settings_notifications_role_changed();
			case 'warning_received': return m.settings_notifications_warning_received();
			case 'report_resolved': return m.settings_notifications_report_resolved();
		}
	}

	function notifDesc(key: NotificationKey): string {
		switch (key) {
			case 'new_review': return m.settings_notifications_new_review_desc();
			case 'listing_expired': return m.settings_notifications_listing_expired_desc();
			case 'role_changed': return m.settings_notifications_role_changed_desc();
			case 'warning_received': return m.settings_notifications_warning_received_desc();
			case 'report_resolved': return m.settings_notifications_report_resolved_desc();
		}
	}

	function parsePrefs(): Record<NotificationKey, boolean> {
		const raw = data.profile?.notification_preferences ?? '{}';
		let prefs: Record<string, boolean> = {};
		try { prefs = JSON.parse(raw); } catch { /* ignore */ }
		const out = {} as Record<NotificationKey, boolean>;
		for (const key of NOTIFICATION_KEYS) {
			// Empty/missing means enabled by default
			out[key] = prefs[key] !== false;
		}
		return out;
	}

	let notificationPrefs = $state(parsePrefs());
	let initialPrefs = $state(JSON.stringify(parsePrefs()));
	let saving = $state(false);

	const isDirty = $derived(JSON.stringify(notificationPrefs) !== initialPrefs);

	beforeNavigate(({ cancel }) => {
		if (!isDirty || saving) return;
		const ok = confirm('You have unsaved changes. Leave anyway?');
		if (!ok) cancel();
	});

	async function handleSave() {
		saving = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/users/notification-preferences`, {
				method: 'PUT',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					notification_preferences: JSON.stringify(notificationPrefs),
				}),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error ?? 'Failed to save');

			toast.success(m.settings_notifications_updated());
			initialPrefs = JSON.stringify(notificationPrefs);
			await invalidateAll();
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to save');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Notifications · {data.siteConfig?.site_name ?? 'OpenMarket'}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">{m.settings_notifications_title()}</h1>
		<p class="text-muted-foreground">{m.settings_notifications_subtitle()}</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.settings_notifications_card_title()}</Card.Title>
			<Card.Description>
				{m.settings_notifications_card_description()}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#each NOTIFICATION_KEYS as key, i}
				<div class="flex items-center justify-between gap-4">
					<div class="flex-1">
						<Label class="text-sm font-medium">{notifLabel(key)}</Label>
						<p class="text-xs text-muted-foreground">{notifDesc(key)}</p>
					</div>
					<Switch bind:checked={notificationPrefs[key]} />
				</div>
				{#if i < NOTIFICATION_KEYS.length - 1}
					<Separator />
				{/if}
			{/each}
		</Card.Content>
	</Card.Root>

	<!-- Sticky save bar -->
	<div class="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg">
		<div class="flex items-center gap-2">
			{#if isDirty}
				<Badge variant="secondary">{m.common_unsaved_changes()}</Badge>
			{:else}
				<span class="text-sm text-muted-foreground">{m.common_all_changes_saved()}</span>
			{/if}
		</div>
		<Button onclick={handleSave} disabled={!isDirty || saving}>
			{#if saving}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{m.button_saving()}
			{:else}
				{m.button_save_changes()}
			{/if}
		</Button>
	</div>
</div>
