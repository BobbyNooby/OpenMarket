<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Table from '$lib/components/ui/table';
	import type { AdminUser } from './admin-api';

	interface Props {
		users: AdminUser[];
		isLoading: boolean;
		onManageRoles: (user: AdminUser) => void;
	}

	let { users, isLoading, onManageRoles }: Props = $props();

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
							<Button size="sm" variant="outline" onclick={() => onManageRoles(user)}>
								Manage Roles
							</Button>
						</Table.Cell>
					</Table.Row>
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>
</div>
