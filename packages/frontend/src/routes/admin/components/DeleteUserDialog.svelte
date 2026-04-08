<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { deleteUser, type AdminUser } from './admin-api';
	import { toast } from 'svelte-sonner';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { m } from '$lib/paraglide/messages.js';

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

			toast.success(m.admin_delete_user_success({ user: `@${user.username}` }));
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
			<Dialog.Title>{m.admin_delete_user_title()}</Dialog.Title>
			<Dialog.Description>
				{#if step === 1}
					{m.admin_delete_user_confirm({ user: `@${user.username}` })}
				{:else}
					{m.admin_delete_user_permanent()}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if step === 1}
			<div class="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-4">
				<CircleAlert class="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
				<div class="text-sm">
					<p class="font-medium text-destructive">{m.admin_delete_user_warning_title()}</p>
					<p class="mt-1 text-muted-foreground">{m.admin_delete_user_warning_text()}</p>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => { open = false; }}>
					{m.button_cancel()}
				</Button>
				<Button variant="destructive" onclick={() => { step = 2; }}>
					{m.button_continue()}
				</Button>
			</Dialog.Footer>

		{:else}
			<div class="space-y-4 py-2">
				<div class="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm">
					<p class="mb-2 font-medium text-destructive">
						{m.admin_delete_user_deleting_title({ user: `@${user.username}` })}
					</p>
					<ul class="list-inside list-disc space-y-1 text-muted-foreground">
						<li>{m.admin_delete_user_profile()}</li>
						<li>{m.admin_delete_user_listings()}</li>
						<li>{m.admin_delete_user_reviews()}</li>
						<li>{m.admin_delete_user_reports()}</li>
						<li>{m.admin_delete_user_bans()}</li>
						<li>{m.admin_delete_user_roles()}</li>
						<li>{m.admin_delete_user_sessions()}</li>
					</ul>
				</div>

				<div class="space-y-2">
					<Label>
							{m.admin_delete_user_type_confirm({ username: user.username })}
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
					{m.button_back()}
				</Button>
				<Button
					variant="destructive"
					onclick={handleDelete}
					disabled={saving || !usernameMatches}
				>
					{saving ? m.admin_delete_user_deleting() : m.admin_delete_user_button()}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
