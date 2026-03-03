<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { deleteUser, type AdminUser } from './admin-api';
	import { toast } from 'svelte-sonner';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	interface Props {
		open: boolean;
		user: AdminUser;
		onDeleted: () => void;
	}

	let { open = $bindable(), user, onDeleted }: Props = $props();

	let step = $state<1 | 2>(1);
	let confirmUsername = $state('');
	let saving = $state(false);

	const usernameMatches = $derived(confirmUsername === user.username);

	function resetForm() {
		step = 1;
		confirmUsername = '';
	}

	async function handleDelete() {
		if (!usernameMatches) return;

		saving = true;

		try {
			const result = await deleteUser(user.id);

			if (!result.success) {
				throw new Error(result.error || 'Failed to delete user');
			}

			toast.success(`@${user.username} has been permanently deleted`);
			onDeleted();
			resetForm();
			open = false;
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete user');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) resetForm(); }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete User</Dialog.Title>
			<Dialog.Description>
				{#if step === 1}
					Are you sure you want to delete <span class="font-semibold">@{user.username}</span>?
				{:else}
					This action is permanent and cannot be undone.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if step === 1}
			<div class="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-4">
				<CircleAlert class="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
				<div class="text-sm">
					<p class="font-medium text-destructive">This will permanently delete this user account.</p>
					<p class="mt-1 text-muted-foreground">
						All associated data will be removed. This action cannot be undone.
					</p>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => { open = false; }}>
					Cancel
				</Button>
				<Button variant="destructive" onclick={() => { step = 2; }}>
					Continue
				</Button>
			</Dialog.Footer>

		{:else}
			<div class="space-y-4 py-2">
				<div class="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm">
					<p class="mb-2 font-medium text-destructive">
						Deleting @{user.username} will permanently remove:
					</p>
					<ul class="list-inside list-disc space-y-1 text-muted-foreground">
						<li>Their profile and activity data</li>
						<li>All listings they created</li>
						<li>All reviews they gave and received</li>
						<li>All reports they submitted</li>
						<li>All bans and warnings on their account</li>
						<li>All role assignments</li>
						<li>Their login sessions and OAuth connections</li>
					</ul>
				</div>

				<div class="space-y-2">
					<Label>
						Type <span class="font-mono font-semibold text-destructive">{user.username}</span> to confirm
					</Label>
					<Input
						bind:value={confirmUsername}
						placeholder={user.username}
						autocomplete="off"
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => { step = 1; }} disabled={saving}>
					Back
				</Button>
				<Button
					variant="destructive"
					onclick={handleDelete}
					disabled={saving || !usernameMatches}
				>
					{saving ? 'Deleting...' : 'Delete User Permanently'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
