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
		return new Date(dateString).toLocaleDateString('en-US', {
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
				<Table.Head>User</Table.Head>
				<Table.Head>Email</Table.Head>
				<Table.Head>Roles</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head>Joined</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
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
								<Badge variant="destructive" class="text-xs">Banned</Badge>
							{:else}
								<Badge variant="outline" class="text-xs text-green-600 border-green-600">Active</Badge>
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
										Manage Roles
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={() => onViewHistory(user)}>
										<History class="h-4 w-4" />
										View History
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={() => onWarnUser(user)}>
										<TriangleAlert class="h-4 w-4" />
										Warn User
									</DropdownMenu.Item>
									{#if user.is_banned}
										<DropdownMenu.Item onclick={() => onUnbanUser(user)}>
											<ShieldCheck class="h-4 w-4" />
											Unban User
										</DropdownMenu.Item>
									{:else}
										<DropdownMenu.Item variant="destructive" onclick={() => onBanUser(user)}>
											<ShieldAlert class="h-4 w-4" />
											Ban User
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Separator />
									<DropdownMenu.Item variant="destructive" onclick={() => onDeleteUser(user)}>
										<Trash2 class="h-4 w-4" />
										Delete User
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
