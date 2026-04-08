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

	let { data } = $props();

	type NotificationKey =
		| 'new_review'
		| 'listing_expired'
		| 'role_changed'
		| 'warning_received'
		| 'report_resolved';

	const NOTIFICATION_TYPES: { key: NotificationKey; label: string; description: string }[] = [
		{ key: 'new_review', label: 'Profile Reviews', description: 'When someone leaves a review on your profile' },
		{ key: 'listing_expired', label: 'Listing Expiry', description: 'When one of your listings expires' },
		{ key: 'role_changed', label: 'Role Changes', description: 'When an admin updates your role' },
		{ key: 'warning_received', label: 'Warnings', description: 'When a moderator issues you a warning' },
		{ key: 'report_resolved', label: 'Report Resolved', description: 'When a report you filed is resolved' },
	];

	function parsePrefs(): Record<NotificationKey, boolean> {
		const raw = data.profile?.notification_preferences ?? '{}';
		let prefs: Record<string, boolean> = {};
		try { prefs = JSON.parse(raw); } catch { /* ignore */ }
		const out = {} as Record<NotificationKey, boolean>;
		for (const { key } of NOTIFICATION_TYPES) {
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

			toast.success('Notification preferences updated');
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
	<title>Notifications · OpenMarket</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">Notifications</h1>
		<p class="text-muted-foreground">Choose which alerts you receive.</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Notification preferences</Card.Title>
			<Card.Description>
				Toggle individual notification types on or off. Disabled notifications are silently dropped — you won't see them anywhere.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#each NOTIFICATION_TYPES as { key, label, description: desc }, i}
				<div class="flex items-center justify-between gap-4">
					<div class="flex-1">
						<Label class="text-sm font-medium">{label}</Label>
						<p class="text-xs text-muted-foreground">{desc}</p>
					</div>
					<Switch bind:checked={notificationPrefs[key]} />
				</div>
				{#if i < NOTIFICATION_TYPES.length - 1}
					<Separator />
				{/if}
			{/each}
		</Card.Content>
	</Card.Root>

	<!-- Sticky save bar -->
	<div class="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg">
		<div class="flex items-center gap-2">
			{#if isDirty}
				<Badge variant="secondary">Unsaved changes</Badge>
			{:else}
				<span class="text-sm text-muted-foreground">All changes saved</span>
			{/if}
		</div>
		<Button onclick={handleSave} disabled={!isDirty || saving}>
			{#if saving}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Saving...
			{:else}
				Save changes
			{/if}
		</Button>
	</div>
</div>
