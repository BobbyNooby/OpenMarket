<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { banUser, type AdminUser } from './admin-api';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		user: AdminUser;
		onBanned: () => void;
	}

	let { open = $bindable(), user, onBanned }: Props = $props();

	let reason = $state('');
	let isPermanent = $state(true);
	let expiresAt = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	function resetForm() {
		reason = '';
		isPermanent = true;
		expiresAt = '';
		error = null;
	}

	async function handleBan() {
		if (!reason.trim()) {
			error = 'Reason is required';
			return;
		}

		saving = true;
		error = null;

		try {
			const result = await banUser(
				user.id,
				reason.trim(),
				isPermanent ? undefined : expiresAt || undefined
			);

			if (!result.success) {
				throw new Error(result.error || 'Failed to ban user');
			}

			toast.success(`@${user.username} has been banned`);
			onBanned();
			resetForm();
			open = false;
		} catch (err: any) {
			toast.error(err.message || 'Failed to ban user');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) resetForm(); }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Ban User</Dialog.Title>
			<Dialog.Description>
				Ban <span class="font-semibold">@{user.username}</span> from the marketplace.
			</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label>Reason <span class="text-destructive">*</span></Label>
				<Textarea bind:value={reason} placeholder="Reason for banning this user..." rows={3} />
			</div>

			<div class="flex items-center gap-2">
				<Checkbox
					checked={isPermanent}
					onCheckedChange={(v) => { isPermanent = !!v; }}
				/>
				<Label class="text-sm">Permanent ban</Label>
			</div>

			{#if !isPermanent}
				<div class="space-y-2">
					<Label>Expires at</Label>
					<Input type="datetime-local" bind:value={expiresAt} />
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => { open = false; }} disabled={saving}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={handleBan} disabled={saving || !reason.trim()}>
				{saving ? 'Banning...' : 'Ban User'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
