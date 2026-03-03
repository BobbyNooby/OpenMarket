<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		targetType: 'listing' | 'review' | 'user';
		targetId: string;
		targetLabel?: string;
	}

	let { open = $bindable(), targetType, targetId, targetLabel = 'this content' }: Props = $props();

	let reason = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	function resetForm() {
		reason = '';
		error = null;
	}

	async function handleSubmit() {
		if (!reason.trim()) {
			error = 'Please provide a reason for your report';
			return;
		}

		saving = true;
		error = null;

		try {
			const res = await fetch(`${PUBLIC_API_URL}/reports`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					target_type: targetType,
					target_id: targetId,
					reason: reason.trim()
				})
			});
			const result = await res.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to submit report');
			}

			toast.success('Report submitted — a moderator will review it shortly');
			open = false;
		} catch (err: any) {
			toast.error(err.message || 'Failed to submit report');
		} finally {
			saving = false;
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) resetForm();
		open = isOpen;
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Report Content</Dialog.Title>
			<Dialog.Description>
				Report {targetLabel} for violating community guidelines.
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
				<Textarea
					bind:value={reason}
					placeholder="Describe why you are reporting this content..."
					rows={4}
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={saving}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={handleSubmit} disabled={saving || !reason.trim()}>
				{saving ? 'Submitting...' : 'Submit Report'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
