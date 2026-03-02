<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { warnUser, type AdminUser } from './admin-api';

	interface Props {
		open: boolean;
		user: AdminUser;
		onWarned: () => void;
	}

	let { open = $bindable(), user, onWarned }: Props = $props();

	let reason = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	function resetForm() {
		reason = '';
		error = null;
	}

	async function handleWarn() {
		if (!reason.trim()) {
			error = 'Reason is required';
			return;
		}

		saving = true;
		error = null;

		try {
			const result = await warnUser(user.id, reason.trim());

			if (!result.success) {
				throw new Error(result.error || 'Failed to warn user');
			}

			onWarned();
			resetForm();
			open = false;
		} catch (err: any) {
			error = err.message || 'An error occurred';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) resetForm(); }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Warn User</Dialog.Title>
			<Dialog.Description>
				Issue a warning to <span class="font-semibold">@{user.username}</span>.
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
				<Textarea bind:value={reason} placeholder="Reason for warning this user..." rows={3} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => { open = false; }} disabled={saving}>
				Cancel
			</Button>
			<Button onclick={handleWarn} disabled={saving || !reason.trim()}>
				{saving ? 'Sending...' : 'Send Warning'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
