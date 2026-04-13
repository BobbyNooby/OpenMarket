<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { AdminUser } from './admin-api';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import History from '@lucide/svelte/icons/history';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		users: AdminUser[];
		isLoading: boolean;
		onManageRoles: (user: AdminUser) => void;
		onBanUser: (user: AdminUser) => void;
		onUnbanUser: (user: AdminUser) => void;
		onWarnUser: (user: AdminUser) => void;
		onViewHistory: (user: AdminUser) => void;
		onDeleteUser: (user: AdminUser) => void;
	}

	let { users, isLoading, onManageRoles, onBanUser, onUnbanUser, onWarnUser, onViewHistory, onDeleteUser }: Props = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="rounded-lg border border-border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>{m.admin_users_column_user()}</Table.Head>
				<Table.Head>{m.admin_users_column_email()}</Table.Head>
				<Table.Head>{m.admin_users_column_roles()}</Table.Head>
				<Table.Head>{m.admin_users_column_status()}</Table.Head>
				<Table.Head>{m.admin_users_column_joined()}</Table.Head>
				<Table.Head class="text-right">{m.admin_users_column_actions()}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if isLoading}
				<Table.Row>
					<Table.Cell colspan={6} class="text-center py-8 text-muted-foreground">
						Loading...
					</Table.Cell>
				</Table.Row>
			{:else if users.length === 0}
				<Table.Row>
					<Table.Cell colspan={6} class="text-center py-8 text-muted-foreground">
						No users found
					</Table.Cell>
				</Table.Row>
			{:else}
				{#each users as user}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center gap-3">
								<Avatar.Root class="size-8">
									{#if user.image}
										<Avatar.Image src={user.image} alt={user.name} />
									{/if}
									<Avatar.Fallback class="bg-primary text-xs font-bold text-primary-foreground">
										{user.name.charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<div>
									<p class="font-medium text-foreground">{user.name}</p>
									<p class="text-xs text-muted-foreground">@{user.username}</p>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell class="text-sm text-muted-foreground">
							{user.email}
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-wrap gap-1">
								{#each user.roles as role}
									<Badge variant="outline" class="text-xs">{role}</Badge>
								{/each}
								{#if user.roles.length === 0}
									<span class="text-xs text-muted-foreground">No roles</span>
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if user.is_banned}
								<Badge variant="destructive" class="text-xs">{m.admin_users_status_banned()}</Badge>
							{:else}
								<Badge variant="outline" class="text-xs text-green-600 border-green-600">{m.admin_users_status_active()}</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-sm text-muted-foreground">
							{formatDate(user.created_at)}
						</Table.Cell>
						<Table.Cell class="text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} size="sm" variant="ghost">
											<Ellipsis class="h-4 w-4" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onclick={() => onManageRoles(user)}>
										<UserCog class="h-4 w-4" />
										{m.admin_users_action_manage_roles()}
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={() => onViewHistory(user)}>
										<History class="h-4 w-4" />
										{m.admin_users_action_view_history()}
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={() => onWarnUser(user)}>
										<TriangleAlert class="h-4 w-4" />
										{m.admin_users_action_warn()}
									</DropdownMenu.Item>
									{#if user.is_banned}
										<DropdownMenu.Item onclick={() => onUnbanUser(user)}>
											<ShieldCheck class="h-4 w-4" />
											{m.admin_users_action_unban()}
										</DropdownMenu.Item>
									{:else}
										<DropdownMenu.Item variant="destructive" onclick={() => onBanUser(user)}>
											<ShieldAlert class="h-4 w-4" />
											{m.admin_users_action_ban()}
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Separator />
									<DropdownMenu.Item variant="destructive" onclick={() => onDeleteUser(user)}>
										<Trash2 class="h-4 w-4" />
										{m.admin_users_action_delete()}
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>
</div>
