<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { apiFetch, apiJson } from './admin-api';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	const FIELDS: { key: string; label: string; placeholder: string; section: string; multiline?: boolean }[] = [
		// Identity
		{ key: 'site_name', label: 'Site name', placeholder: 'OpenMarket', section: 'Identity' },
		{ key: 'site_tagline', label: 'Tagline', placeholder: 'The marketplace for trading game items', section: 'Identity' },
		// Branding
		{ key: 'site_logo_url', label: 'Logo URL', placeholder: 'https://...', section: 'Branding' },
		{ key: 'site_favicon_url', label: 'Favicon URL', placeholder: 'https://...', section: 'Branding' },
		// Footer & Links
		{ key: 'footer_text', label: 'Footer text', placeholder: '© 2026 OpenMarket', section: 'Footer & Links', multiline: true },
		{ key: 'support_url', label: 'Support URL', placeholder: 'https://...', section: 'Footer & Links' },
		{ key: 'discord_url', label: 'Discord invite URL', placeholder: 'https://discord.gg/...', section: 'Footer & Links' },
	];

	const SECTIONS = ['Identity', 'Branding', 'Footer & Links'];

	let loading = $state(true);
	let saving = $state(false);
	let values = $state<Record<string, string>>({});
	let initial = $state<Record<string, string>>({});

	async function loadConfig() {
		loading = true;
		const result = await apiFetch('/admin/site-config');
		if (result.success && result.data) {
			values = { ...result.data.config };
			initial = { ...result.data.config };
		} else {
			toast.error(result.error ?? 'Failed to load config');
		}
		loading = false;
	}

	$effect(() => {
		loadConfig();
	});

	const isDirty = $derived.by(() => {
		for (const f of FIELDS) {
			if ((values[f.key] ?? '') !== (initial[f.key] ?? '')) return true;
		}
		return false;
	});

	async function handleSave() {
		saving = true;
		// Only send the keys that exist in our form to avoid sending unrelated keys
		const updates: Record<string, string> = {};
		for (const f of FIELDS) updates[f.key] = values[f.key] ?? '';

		const result = await apiJson('/admin/site-config', 'PUT', updates);
		if (result.success) {
			toast.success('Site config saved');
			initial = { ...values };
			await invalidateAll();
		} else {
			toast.error(result.error ?? 'Failed to save');
		}
		saving = false;
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold text-foreground">Site Config</h2>
		<p class="text-sm text-muted-foreground">
			Customize the platform's name, branding, and footer.
		</p>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	{:else}
		{#each SECTIONS as section}
			<Card.Root>
				<Card.Header>
					<Card.Title>{section}</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#each FIELDS.filter((f) => f.section === section) as field}
						<div class="space-y-2">
							<Label for={field.key}>{field.label}</Label>
							{#if field.multiline}
								<Textarea
									id={field.key}
									placeholder={field.placeholder}
									bind:value={values[field.key]}
									rows={3}
								/>
							{:else}
								<Input
									id={field.key}
									placeholder={field.placeholder}
									bind:value={values[field.key]}
								/>
							{/if}
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}

		<div class="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg">
			<div class="flex items-center gap-2">
				{#if isDirty}
					<Badge variant="secondary">Unsaved changes</Badge>
				{:else}
					<span class="text-sm text-muted-foreground">All changes saved</span>
				{/if}
			</div>
			<Button onclick={handleSave} disabled={!isDirty || saving}>
				{#if saving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Save changes
				{/if}
			</Button>
		</div>
	{/if}
</div>
