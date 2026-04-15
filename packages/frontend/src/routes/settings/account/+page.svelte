<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { authClient } from '$lib/api/client';
	import { m } from '$lib/paraglide/messages.js';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Key from '@lucide/svelte/icons/key';
	import Link from '@lucide/svelte/icons/link';
	import Download from '@lucide/svelte/icons/download';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';

	let { data } = $props();

	const accounts = $derived(data.accounts ?? []);
	const hasEmail = $derived(accounts.some((a: any) => a.provider === 'credential' || a.provider === 'email'));
	const hasDiscord = $derived(accounts.some((a: any) => a.provider === 'discord'));

	// Add password form state
	let showAddPassword = $state(false);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);

	async function handleAddPassword() {
		if (!newPassword || newPassword.length < 8) {
			toast.error('Password must be at least 8 characters');
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error('Passwords do not match');
			return;
		}
		loading = true;
		try {
			// better-auth requires email to link password
			const res = await fetch(`${PUBLIC_API_URL}/api/auth/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ newPassword })
			});
			const json = await res.json();
			if (json.error) {
				toast.error(json.error.message || 'Failed to set password');
				return;
			}
			toast.success('Password set successfully');
			showAddPassword = false;
			newPassword = '';
			confirmPassword = '';
			window.location.reload();
		} catch {
			toast.error('Failed to set password');
		} finally {
			loading = false;
		}
	}

	async function handleChangePassword() {
		toast.info('Password change coming soon');
	}

	let exporting = $state(false);
	let deleting = $state(false);
	let deleteConfirm = $state('');
	let showDeleteDialog = $state(false);

	async function handleExportData() {
		exporting = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/users/me/export`, {
				credentials: 'include'
			});
			if (!res.ok) throw new Error('Export failed');
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'openmarket-data-export.json';
			a.click();
			URL.revokeObjectURL(url);
			toast.success(m.settings_account_export_success());
		} catch {
			toast.error(m.settings_account_export_error());
		} finally {
			exporting = false;
		}
	}

	async function handleDeleteAccount() {
		if (deleteConfirm !== 'DELETE') return;
		deleting = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/users/me`, {
				method: 'DELETE',
				credentials: 'include'
			});
			const json = await res.json();
			if (json.success) {
				window.location.href = '/';
			} else {
				toast.error(json.error || m.settings_account_delete_error());
			}
		} catch {
			toast.error(m.settings_account_delete_error());
		} finally {
			deleting = false;
		}
	}

	async function handleLinkDiscord() {
		await authClient.linkSocial({
			provider: 'discord',
			callbackURL: window.location.origin + '/settings/account'
		});
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">Account Settings</h1>
		<p class="text-muted-foreground">Manage your authentication methods and account security</p>
	</div>

	<!-- Linked Accounts -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Link class="h-5 w-5" />
				Linked Accounts
			</Card.Title>
			<Card.Description>
				Accounts you've connected to sign in
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#each accounts as account}
				<div class="flex items-center justify-between rounded-lg border border-border p-4">
					<div class="flex items-center gap-3">
						{#if account.provider === 'discord'}
							<svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
								<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.332-.946 2.418-2.157 2.418z"/>
							</svg>
							<span class="font-medium">Discord</span>
						{:else}
							<Key class="h-6 w-6" />
							<span class="font-medium">Email / Password</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Badge variant="secondary">
							Linked {formatDate(account.linked_at)}
						</Badge>
					</div>
				</div>
			{/each}

			{#if !hasDiscord}
				<div class="flex items-center justify-between rounded-lg border border-border p-4">
					<div class="flex items-center gap-3">
						<svg class="h-6 w-6 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
							<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.332-.946 2.418-2.157 2.418z"/>
						</svg>
						<span class="font-medium text-muted-foreground">Discord</span>
					</div>
					<Button variant="outline" size="sm" onclick={handleLinkDiscord}>
						Link Discord
					</Button>
				</div>
			{/if}

			{#if !hasEmail && !showAddPassword}
				<div class="flex items-center justify-between rounded-lg border border-border p-4">
					<div class="flex items-center gap-3">
						<Key class="h-6 w-6 text-muted-foreground" />
						<span class="font-medium text-muted-foreground">Email / Password</span>
					</div>
					<Button variant="outline" size="sm" onclick={() => showAddPassword = true}>
						Add Password
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if showAddPassword || hasEmail}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Key class="h-5 w-5" />
					{hasEmail ? 'Change Password' : 'Set Password'}
				</Card.Title>
				<Card.Description>
					{hasEmail ? 'Update your account password' : 'Create a password for your account'}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="new-password">New Password</Label>
						<Input
							id="new-password"
							type="password"
							placeholder="••••••••"
							bind:value={newPassword}
							disabled={loading}
						/>
					</div>
					<div class="space-y-2">
						<Label for="confirm-password">Confirm Password</Label>
						<Input
							id="confirm-password"
							type="password"
							placeholder="••••••••"
							bind:value={confirmPassword}
							disabled={loading}
						/>
					</div>
					<div class="flex gap-2">
						<Button onclick={handleAddPassword} disabled={loading}>
							{#if loading}
								<Loader2 class="h-4 w-4 animate-spin" />
							{/if}
							{hasEmail ? 'Change Password' : 'Set Password'}
						</Button>
						{#if showAddPassword}
							<Button variant="outline" onclick={() => { showAddPassword = false; newPassword = ''; confirmPassword = ''; }}>
								Cancel
							</Button>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Data & Privacy -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Download class="h-5 w-5" />
				{m.settings_account_data_title()}
			</Card.Title>
			<Card.Description>
				{m.settings_account_data_description()}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="mb-4 text-sm text-muted-foreground">{m.settings_account_export_description()}</p>
			<Button variant="outline" onclick={handleExportData} disabled={exporting}>
				{#if exporting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<Download class="mr-2 h-4 w-4" />
				{/if}
				{m.settings_account_export_button()}
			</Button>
		</Card.Content>
	</Card.Root>

	<!-- Danger Zone -->
	<Card.Root class="border-destructive/50">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-destructive">
				<Trash2 class="h-5 w-5" />
				{m.settings_account_danger_title()}
			</Card.Title>
			<Card.Description>
				{m.settings_account_danger_description()}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="mb-4 text-sm text-muted-foreground">{m.settings_account_delete_warning()}</p>
			<AlertDialog.Root bind:open={showDeleteDialog}>
				<AlertDialog.Trigger>
					{#snippet child({ props })}
						<Button variant="destructive" {...props}>
							<Trash2 class="mr-2 h-4 w-4" />
							{m.settings_account_delete_button()}
						</Button>
					{/snippet}
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>{m.settings_account_delete_confirm_title()}</AlertDialog.Title>
						<AlertDialog.Description>
							{m.settings_account_delete_confirm_description()}
						</AlertDialog.Description>
					</AlertDialog.Header>
					<div class="py-4">
						<Label for="delete-confirm">{m.settings_account_delete_confirm_label()}</Label>
						<Input
							id="delete-confirm"
							bind:value={deleteConfirm}
							placeholder="DELETE"
							class="mt-2"
						/>
					</div>
					<AlertDialog.Footer>
						<AlertDialog.Cancel onclick={() => { deleteConfirm = ''; }}>
							{m.button_cancel()}
						</AlertDialog.Cancel>
						<Button
							variant="destructive"
							onclick={handleDeleteAccount}
							disabled={deleteConfirm !== 'DELETE' || deleting}
						>
							{#if deleting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							{m.settings_account_delete_permanent()}
						</Button>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</Card.Content>
	</Card.Root>
</div>