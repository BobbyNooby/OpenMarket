<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import type { Permission } from './admin-api';

	interface Props {
		permissions: Permission[];
		checked: Set<string>;
		onToggle: (permissionId: string) => void;
	}

	let { permissions, checked, onToggle }: Props = $props();

	// Group permissions by category (prefix before ":")
	const grouped = $derived(() => {
		const groups: Record<string, Permission[]> = {};
		for (const perm of permissions) {
			const [category] = perm.id.split(':');
			const key = category.charAt(0).toUpperCase() + category.slice(1);
			if (!groups[key]) groups[key] = [];
			groups[key].push(perm);
		}
		return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
	});
</script>

<div class="space-y-4">
	<h3 class="text-lg font-semibold text-foreground">Permissions</h3>

	<div class="space-y-6 max-h-[400px] overflow-y-auto pr-2">
		{#each grouped() as [category, perms]}
			<div class="space-y-2">
				<h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
					{category}
				</h4>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each perms as perm}
						<div class="flex items-center gap-2">
							<Checkbox
								checked={checked.has(perm.id)}
								onCheckedChange={() => onToggle(perm.id)}
							/>
							<Label class="text-sm font-normal cursor-pointer">
								{perm.id}
							</Label>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
