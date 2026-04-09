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
	import { ImageUploader } from '$lib/components/ui/image-uploader';
	import { m } from '$lib/paraglide/messages.js';

	type SectionKey = 'identity' | 'branding' | 'footer';

	const FIELDS: { key: string; labelKey: string; placeholderKey: string; section: SectionKey; multiline?: boolean; isImage?: boolean }[] = [
		{ key: 'site_name', labelKey: 'admin_site_config_site_name', placeholderKey: 'admin_site_config_site_name_placeholder', section: 'identity' },
		{ key: 'site_tagline', labelKey: 'admin_site_config_tagline', placeholderKey: 'admin_site_config_tagline_placeholder', section: 'identity' },
		{ key: 'site_logo_url', labelKey: 'admin_site_config_logo_url', placeholderKey: 'admin_site_config_logo_url_placeholder', section: 'branding', isImage: true },
		{ key: 'site_favicon_url', labelKey: 'admin_site_config_favicon_url', placeholderKey: 'admin_site_config_favicon_url_placeholder', section: 'branding', isImage: true },
		{ key: 'footer_text', labelKey: 'admin_site_config_footer_text', placeholderKey: 'admin_site_config_footer_text_placeholder', section: 'footer', multiline: true },
		{ key: 'support_url', labelKey: 'admin_site_config_support_url', placeholderKey: 'admin_site_config_support_url_placeholder', section: 'footer' },
		{ key: 'discord_url', labelKey: 'admin_site_config_discord_url', placeholderKey: 'admin_site_config_discord_url_placeholder', section: 'footer' },
	];

	const SECTIONS: SectionKey[] = ['identity', 'branding', 'footer'];

	function sectionTitle(key: SectionKey): string {
		switch (key) {
			case 'identity': return m.admin_site_config_section_identity();
			case 'branding': return m.admin_site_config_section_branding();
			case 'footer': return m.admin_site_config_section_footer();
		}
	}

	function getLabel(field: typeof FIELDS[0]): string {
		switch (field.labelKey) {
			case 'admin_site_config_site_name': return m.admin_site_config_site_name();
			case 'admin_site_config_tagline': return m.admin_site_config_tagline();
			case 'admin_site_config_logo_url': return m.admin_site_config_logo_url();
			case 'admin_site_config_favicon_url': return m.admin_site_config_favicon_url();
			case 'admin_site_config_footer_text': return m.admin_site_config_footer_text();
			case 'admin_site_config_support_url': return m.admin_site_config_support_url();
			case 'admin_site_config_discord_url': return m.admin_site_config_discord_url();
			default: return field.key;
		}
	}

	function getPlaceholder(field: typeof FIELDS[0]): string {
		switch (field.placeholderKey) {
			case 'admin_site_config_site_name_placeholder': return m.admin_site_config_site_name_placeholder();
			case 'admin_site_config_tagline_placeholder': return m.admin_site_config_tagline_placeholder();
			case 'admin_site_config_logo_url_placeholder': return m.admin_site_config_logo_url_placeholder();
			case 'admin_site_config_favicon_url_placeholder': return m.admin_site_config_favicon_url_placeholder();
			case 'admin_site_config_footer_text_placeholder': return m.admin_site_config_footer_text_placeholder();
			case 'admin_site_config_support_url_placeholder': return m.admin_site_config_support_url_placeholder();
			case 'admin_site_config_discord_url_placeholder': return m.admin_site_config_discord_url_placeholder();
			default: return '';
		}
	}

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
			toast.error(result.error ?? m.admin_site_config_error());
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
		const updates: Record<string, string> = {};
		for (const f of FIELDS) updates[f.key] = values[f.key] ?? '';

		const result = await apiJson('/admin/site-config', 'PUT', updates);
		if (result.success) {
			toast.success(m.admin_site_config_saved());
			initial = { ...values };
			await invalidateAll();
		} else {
			toast.error(result.error ?? m.admin_site_config_error());
		}
		saving = false;
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold text-foreground">{m.admin_site_config_title()}</h2>
		<p class="text-sm text-muted-foreground">
			{m.admin_site_config_subtitle()}
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
					<Card.Title>{sectionTitle(section)}</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#each FIELDS.filter((f) => f.section === section) as field}
						<div class="space-y-2">
							{#if field.isImage}
								<ImageUploader bind:value={values[field.key]} label={getLabel(field)} />
							{:else}
								<Label for={field.key}>{getLabel(field)}</Label>
								{#if field.multiline}
									<Textarea
										id={field.key}
										placeholder={getPlaceholder(field)}
										bind:value={values[field.key]}
										rows={3}
									/>
								{:else}
									<Input
										id={field.key}
										placeholder={getPlaceholder(field)}
										bind:value={values[field.key]}
									/>
								{/if}
							{/if}
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}

		<div class="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg">
			<div class="flex items-center gap-2">
				{#if isDirty}
					<Badge variant="secondary">{m.common_unsaved_changes()}</Badge>
				{:else}
					<span class="text-sm text-muted-foreground">{m.common_all_changes_saved()}</span>
				{/if}
			</div>
			<Button onclick={handleSave} disabled={!isDirty || saving}>
				{#if saving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{m.button_saving()}
				{:else}
					{m.button_save_changes()}
				{/if}
			</Button>
		</div>
	{/if}
</div>
