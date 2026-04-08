<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { apiFetch, apiJson } from './admin-api';
	import { hexToHsl, hslToHex } from '$lib/utils/color';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	type Variant = 'light' | 'dark';
	type ThemeMap = Record<string, string>;

	// Variables grouped by visual purpose
	const SECTIONS: { name: string; variables: string[] }[] = [
		{ name: 'Surfaces', variables: ['background', 'card', 'popover', 'muted'] },
		{
			name: 'Text',
			variables: [
				'foreground',
				'card-foreground',
				'popover-foreground',
				'muted-foreground',
				'secondary-foreground',
				'accent-foreground',
				'destructive-foreground',
				'primary-foreground',
			],
		},
		{ name: 'Brand', variables: ['primary', 'secondary', 'accent'] },
		{ name: 'States', variables: ['destructive', 'border', 'input', 'ring'] },
	];

	let loading = $state(true);
	let saving = $state(false);
	let activeVariant = $state<Variant>('light');

	let theme = $state<Record<Variant, ThemeMap>>({ light: {}, dark: {} });
	let initial = $state<Record<Variant, ThemeMap>>({ light: {}, dark: {} });

	async function loadTheme() {
		loading = true;
		const result = await apiFetch('/admin/site-config');
		if (result.success && result.data?.theme) {
			theme = {
				light: { ...result.data.theme.light },
				dark: { ...result.data.theme.dark },
			};
			initial = {
				light: { ...result.data.theme.light },
				dark: { ...result.data.theme.dark },
			};
		} else {
			toast.error(result.error ?? 'Failed to load theme');
		}
		loading = false;
	}

	$effect(() => {
		loadTheme();
	});

	function isVariantDirty(variant: Variant): boolean {
		const a = theme[variant];
		const b = initial[variant];
		const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
		for (const k of keys) {
			if ((a[k] ?? '') !== (b[k] ?? '')) return true;
		}
		return false;
	}

	const lightDirty = $derived(isVariantDirty('light'));
	const darkDirty = $derived(isVariantDirty('dark'));
	const isDirty = $derived(lightDirty || darkDirty);

	function setColor(variant: Variant, variable: string, hex: string) {
		const hsl = hexToHsl(hex);
		if (!hsl) return;
		theme[variant] = { ...theme[variant], [variable]: hsl };
	}

	function getHex(variant: Variant, variable: string): string {
		const hsl = theme[variant]?.[variable];
		return hsl ? hslToHex(hsl) ?? '#000000' : '#000000';
	}

	async function resetVariable(variant: Variant, variable: string) {
		const result = await apiJson('/admin/site-theme/reset', 'POST', { variant, variable });
		if (result.success) {
			toast.success(`Reset ${variable}`);
			await loadTheme();
			await invalidateAll();
		} else {
			toast.error(result.error ?? 'Failed to reset');
		}
	}

	async function resetVariant(variant: Variant) {
		if (!confirm(`Reset all ${variant} theme variables to defaults?`)) return;
		const result = await apiJson('/admin/site-theme/reset', 'POST', { variant });
		if (result.success) {
			toast.success(`Reset ${variant} theme`);
			await loadTheme();
			await invalidateAll();
		} else {
			toast.error(result.error ?? 'Failed to reset');
		}
	}

	async function saveVariant(variant: Variant) {
		saving = true;
		const result = await apiJson('/admin/site-theme', 'PUT', {
			variant,
			variables: theme[variant],
		});
		if (result.success) {
			toast.success(`${variant} theme saved`);
			initial[variant] = { ...theme[variant] };
			await invalidateAll();
		} else {
			toast.error(result.error ?? 'Failed to save');
		}
		saving = false;
	}

	async function saveAll() {
		saving = true;
		try {
			if (lightDirty) {
				const r1 = await apiJson('/admin/site-theme', 'PUT', { variant: 'light', variables: theme.light });
				if (!r1.success) throw new Error(r1.error ?? 'Failed to save light');
				initial.light = { ...theme.light };
			}
			if (darkDirty) {
				const r2 = await apiJson('/admin/site-theme', 'PUT', { variant: 'dark', variables: theme.dark });
				if (!r2.success) throw new Error(r2.error ?? 'Failed to save dark');
				initial.dark = { ...theme.dark };
			}
			toast.success('Theme saved');
			await invalidateAll();
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to save');
		} finally {
			saving = false;
		}
	}

	// Live preview — builds an inline style with the current draft theme so the preview pane
	// reflects unsaved changes without affecting the rest of the page.
	const previewStyle = $derived.by(() => {
		const vars = theme[activeVariant] ?? {};
		return Object.entries(vars)
			.map(([k, v]) => `--${k}: ${v};`)
			.join(' ');
	});
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold text-foreground">Theme Editor</h2>
		<p class="text-sm text-muted-foreground">
			Customize every shadcn color variable for both light and dark mode.
		</p>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	{:else}
		<Tabs.Root bind:value={activeVariant}>
			<div class="flex items-center justify-between">
				<Tabs.List>
					<Tabs.Trigger value="light">Light{lightDirty ? ' *' : ''}</Tabs.Trigger>
					<Tabs.Trigger value="dark">Dark{darkDirty ? ' *' : ''}</Tabs.Trigger>
				</Tabs.List>
				<Button variant="outline" size="sm" onclick={() => resetVariant(activeVariant)}>
					<RotateCcw class="mr-1.5 h-3.5 w-3.5" />
					Reset {activeVariant} to defaults
				</Button>
			</div>

			{#each ['light', 'dark'] as variant (variant)}
				<Tabs.Content value={variant} class="mt-4 space-y-6">
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<!-- Editor (2/3 width) -->
						<div class="space-y-4 lg:col-span-2">
							{#each SECTIONS as section}
								<Card.Root>
									<Card.Header>
										<Card.Title class="text-base">{section.name}</Card.Title>
									</Card.Header>
									<Card.Content class="space-y-3">
										{#each section.variables as variable}
											<div class="flex items-center gap-3">
												<Label class="w-44 shrink-0 text-xs font-mono">--{variable}</Label>
												<input
													type="color"
													value={getHex(variant as Variant, variable)}
													onchange={(e) => setColor(variant as Variant, variable, e.currentTarget.value)}
													class="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent"
												/>
												<Input
													value={getHex(variant as Variant, variable)}
													oninput={(e) => setColor(variant as Variant, variable, e.currentTarget.value)}
													class="font-mono text-xs"
													maxlength={7}
												/>
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 shrink-0 text-muted-foreground"
													onclick={() => resetVariable(variant as Variant, variable)}
													title="Reset to default"
												>
													<RotateCcw class="h-3.5 w-3.5" />
												</Button>
											</div>
										{/each}
									</Card.Content>
								</Card.Root>
							{/each}
						</div>

						<!-- Live Preview (1/3 width, sticky) -->
						<div class="lg:col-span-1">
							<div class="sticky top-4">
								<Card.Root>
									<Card.Header>
										<Card.Title class="text-base">Live preview</Card.Title>
										<Card.Description>Reflects unsaved changes</Card.Description>
									</Card.Header>
									<Card.Content>
										<div
											class="space-y-3 rounded-lg border border-border p-4"
											style={`${previewStyle} background: hsl(var(--background)); color: hsl(var(--foreground));`}
										>
											<p class="text-sm font-semibold" style="color: hsl(var(--foreground));">Sample text</p>
											<p class="text-xs" style="color: hsl(var(--muted-foreground));">Muted helper text</p>
											<div class="flex flex-wrap gap-2">
												<button
													type="button"
													class="rounded-md px-3 py-1.5 text-xs font-medium"
													style="background: hsl(var(--primary)); color: hsl(var(--primary-foreground));"
												>
													Primary
												</button>
												<button
													type="button"
													class="rounded-md px-3 py-1.5 text-xs font-medium"
													style="background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground));"
												>
													Secondary
												</button>
												<button
													type="button"
													class="rounded-md border px-3 py-1.5 text-xs font-medium"
													style="border-color: hsl(var(--border)); color: hsl(var(--foreground));"
												>
													Outline
												</button>
												<button
													type="button"
													class="rounded-md px-3 py-1.5 text-xs font-medium"
													style="background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground));"
												>
													Destructive
												</button>
											</div>
											<div
												class="rounded-md p-3"
												style="background: hsl(var(--card)); color: hsl(var(--card-foreground)); border: 1px solid hsl(var(--border));"
											>
												<p class="text-xs font-semibold">Card surface</p>
												<p class="text-xs" style="color: hsl(var(--muted-foreground));">With subtle border</p>
											</div>
											<input
												type="text"
												placeholder="Input field"
												class="w-full rounded-md border px-3 py-1.5 text-xs"
												style="background: hsl(var(--background)); border-color: hsl(var(--input)); color: hsl(var(--foreground));"
											/>
										</div>
									</Card.Content>
								</Card.Root>
							</div>
						</div>
					</div>
				</Tabs.Content>
			{/each}
		</Tabs.Root>

		<div class="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg">
			<div class="flex items-center gap-2">
				{#if isDirty}
					<Badge variant="secondary">Unsaved changes</Badge>
				{:else}
					<span class="text-sm text-muted-foreground">All changes saved</span>
				{/if}
			</div>
			<Button onclick={saveAll} disabled={!isDirty || saving}>
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
