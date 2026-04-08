<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { warnUser, type AdminUser } from './admin-api';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';

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
			error = m.admin_reason_required();
			return;
		}

		saving = true;
		error = null;

		try {
			const result = await warnUser(user.id, reason.trim());

			if (!result.success) {
				throw new Error(result.error || m.admin_warn_error());
			}

			toast.success(m.admin_warn_success({ user: `@${user.username}` }));
			onWarned();
			resetForm();
			open = false;
		} catch (err: any) {
			toast.error(err.message || m.admin_warn_error());
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) resetForm(); }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.admin_warn_title()}</Dialog.Title>
			<Dialog.Description>
					{m.admin_warn_description({ user: `@${user.username}` })}
			</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<div class="space-y-4 py-2">
			<div class="space-y-2">
				<Label>{m.admin_warn_reason()} <span class="text-destructive">*</span></Label>
				<Textarea bind:value={reason} placeholder={m.admin_warn_reason_placeholder()} rows={3} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => { open = false; }} disabled={saving}>
				{m.button_cancel()}
			</Button>
			<Button onclick={handleWarn} disabled={saving || !reason.trim()}>
				{saving ? m.admin_warn_sending() : m.admin_warn_button()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
