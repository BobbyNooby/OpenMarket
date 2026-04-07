<script lang="ts">
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import HaveWantEditor from '$lib/components/profile/HaveWantEditor.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	type NotificationKey =
		| 'new_review'
		| 'listing_expired'
		| 'role_changed'
		| 'warning_received'
		| 'report_resolved';

	const NOTIFICATION_TYPES: { key: NotificationKey; label: string; description: string }[] = [
		{ key: 'new_review', label: 'Profile Reviews', description: 'When someone leaves a review on your profile' },
		{ key: 'listing_expired', label: 'Listing Expiry', description: 'When one of your listings expires' },
		{ key: 'role_changed', label: 'Role Changes', description: 'When an admin updates your role' },
		{ key: 'warning_received', label: 'Warnings', description: 'When a moderator issues you a warning' },
		{ key: 'report_resolved', label: 'Report Resolved', description: 'When a report you filed is resolved' },
	];

	// Parse initial values from the loaded profile
	function parseSocial(): { key: string; value: string }[] {
		const links = data.profile?.social_links ?? {};
		return Object.entries(links).map(([key, value]) => ({ key, value: String(value) }));
	}

	function parsePrefs(): Record<NotificationKey, boolean> {
		const raw = data.profile?.notification_preferences ?? '{}';
		let prefs: Record<string, boolean> = {};
		try { prefs = JSON.parse(raw); } catch { /* ignore */ }
		const out = {} as Record<NotificationKey, boolean>;
		for (const { key } of NOTIFICATION_TYPES) {
			// Empty/missing means enabled by default
			out[key] = prefs[key] !== false;
		}
		return out;
	}

	// Form state
	let username = $state(data.profile?.username ?? '');
	let bio = $state(data.profile?.bio ?? '');
	let description = $state(data.profile?.description ?? '');
	let accentColor = $state(data.profile?.accent_color ?? '#6366f1');
	let socialLinks = $state(parseSocial());
	let notificationPrefs = $state(parsePrefs());

	// Snapshot of initial values for dirty tracking
	const initial = {
		username: data.profile?.username ?? '',
		bio: data.profile?.bio ?? '',
		description: data.profile?.description ?? '',
		accentColor: data.profile?.accent_color ?? '#6366f1',
		socialLinks: JSON.stringify(parseSocial()),
		prefs: JSON.stringify(parsePrefs()),
	};

	// Username availability state
	let availabilityState = $state<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
	let availabilityMessage = $state<string | null>(null);
	let checkTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const value = username.trim().toLowerCase();
		if (checkTimer) clearTimeout(checkTimer);

		if (value === initial.username) {
			availabilityState = 'idle';
			availabilityMessage = null;
			return;
		}

		availabilityState = 'checking';
		checkTimer = setTimeout(async () => {
			try {
				const res = await fetch(
					`${PUBLIC_API_URL}/users/username-available?username=${encodeURIComponent(value)}`,
					{ credentials: 'include' },
				);
				const json = await res.json();
				if (json.available) {
					availabilityState = 'available';
					availabilityMessage = 'Available';
				} else {
					availabilityState = json.reason?.toLowerCase().includes('taken') ? 'taken' : 'invalid';
					availabilityMessage = json.reason ?? 'Unavailable';
				}
			} catch {
				availabilityState = 'idle';
				availabilityMessage = null;
			}
		}, 350);
	});

	// Dirty tracking
	const isDirty = $derived(
		username !== initial.username ||
		bio !== initial.bio ||
		description !== initial.description ||
		accentColor !== initial.accentColor ||
		JSON.stringify(socialLinks) !== initial.socialLinks ||
		JSON.stringify(notificationPrefs) !== initial.prefs,
	);

	// Profile completeness — fraction of optional fields filled
	const completeness = $derived.by(() => {
		const filled = [
			!!username,
			!!bio.trim(),
			!!description.trim(),
			accentColor !== '#6366f1',
			socialLinks.some((l) => l.key.trim() && l.value.trim()),
		];
		const count = filled.filter(Boolean).length;
		return Math.round((count / filled.length) * 100);
	});

	beforeNavigate(({ cancel }) => {
		if (!isDirty || saving) return;
		const ok = confirm('You have unsaved changes. Leave anyway?');
		if (!ok) cancel();
	});

	function addSocialLink() {
		socialLinks = [...socialLinks, { key: '', value: '' }];
	}

	function removeSocialLink(idx: number) {
		socialLinks = socialLinks.filter((_, i) => i !== idx);
	}

	let saving = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (availabilityState === 'taken' || availabilityState === 'invalid') {
			toast.error('Please choose a valid username before saving');
			return;
		}

		saving = true;

		// Build social_links JSON, dropping empty rows
		const linksObject: Record<string, string> = {};
		for (const { key, value } of socialLinks) {
			const k = key.trim();
			const v = value.trim();
			if (k && v) linksObject[k] = v;
		}

		const formData = new FormData();
		formData.set('username', username.trim().toLowerCase());
		formData.set('description', description);
		formData.set('bio', bio);
		formData.set('social_links', JSON.stringify(linksObject));
		formData.set('accent_color', accentColor);
		formData.set('notification_preferences', JSON.stringify(notificationPrefs));

		try {
			const res = await fetch('?/save', { method: 'POST', body: formData });
			const result = await res.json();

			if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to save');
			} else {
				toast.success('Profile updated');
				await invalidateAll();
				// Reset dirty snapshot to current values
				initial.username = username;
				initial.bio = bio;
				initial.description = description;
				initial.accentColor = accentColor;
				initial.socialLinks = JSON.stringify(socialLinks);
				initial.prefs = JSON.stringify(notificationPrefs);
				availabilityState = 'idle';
				availabilityMessage = null;
			}
		} catch (err: any) {
			toast.error(err?.message || 'Failed to save');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Profile Settings · OpenMarket</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-10">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">Profile Settings</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Customize how others see you on OpenMarket.
		</p>
	</div>

	<!-- Completeness bar -->
	<Card.Root class="mb-6">
		<Card.Content class="py-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium text-foreground">Profile completeness</span>
				<span class="text-sm text-muted-foreground">{completeness}%</span>
			</div>
			<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-primary transition-all"
					style="width: {completeness}%"
				></div>
			</div>
		</Card.Content>
	</Card.Root>

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Identity -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Identity</Card.Title>
				<Card.Description>Your public-facing name and visual style.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				<div class="space-y-2">
					<Label for="username">Username</Label>
					<div class="relative">
						<Input
							id="username"
							bind:value={username}
							placeholder="your_handle"
							maxlength={20}
						/>
						{#if availabilityState !== 'idle'}
							<div class="absolute right-3 top-1/2 -translate-y-1/2">
								{#if availabilityState === 'checking'}
									<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
								{:else if availabilityState === 'available'}
									<Check class="h-4 w-4 text-green-500" />
								{:else}
									<X class="h-4 w-4 text-destructive" />
								{/if}
							</div>
						{/if}
					</div>
					{#if availabilityMessage}
						<p
							class="text-xs"
							class:text-green-500={availabilityState === 'available'}
							class:text-destructive={availabilityState === 'taken' || availabilityState === 'invalid'}
							class:text-muted-foreground={availabilityState === 'checking'}
						>
							{availabilityMessage}
						</p>
					{:else}
						<p class="text-xs text-muted-foreground">
							3-20 characters, lowercase letters, numbers, and underscores.
						</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="accent">Accent color</Label>
					<div class="flex items-center gap-3">
						<input
							id="accent"
							type="color"
							bind:value={accentColor}
							class="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent"
						/>
						<Input bind:value={accentColor} class="font-mono" maxlength={7} />
					</div>
					<p class="text-xs text-muted-foreground">Used as a highlight on your public profile.</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- About -->
		<Card.Root>
			<Card.Header>
				<Card.Title>About you</Card.Title>
				<Card.Description>Tell other traders a little about yourself.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				<div class="space-y-2">
					<Label for="description">Tagline</Label>
					<Input
						id="description"
						bind:value={description}
						placeholder="Short tagline shown under your name"
						maxlength={120}
					/>
				</div>

				<div class="space-y-2">
					<Label for="bio">Bio</Label>
					<Textarea
						id="bio"
						bind:value={bio}
						placeholder="A longer description of yourself, what you trade, etc."
						rows={5}
						maxlength={500}
					/>
					<p class="text-right text-xs text-muted-foreground">{bio.length}/500</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Social links -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Social links</Card.Title>
				<Card.Description>Add links to your profiles on other platforms.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each socialLinks as link, idx (idx)}
					<div class="flex items-center gap-2">
						<Input
							placeholder="Platform (discord, twitter, ...)"
							bind:value={socialLinks[idx].key}
							class="w-1/3"
						/>
						<Input
							placeholder="Username or URL"
							bind:value={socialLinks[idx].value}
							class="flex-1"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onclick={() => removeSocialLink(idx)}
						>
							<Trash2 class="h-4 w-4 text-muted-foreground" />
						</Button>
					</div>
				{/each}
				{#if socialLinks.length === 0}
					<p class="text-sm text-muted-foreground">No social links added yet.</p>
				{/if}
				<Button type="button" variant="outline" size="sm" onclick={addSocialLink}>
					<Plus class="mr-1.5 h-4 w-4" />
					Add link
				</Button>
			</Card.Content>
		</Card.Root>

		<!-- Have / Want lists -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Have / Want lists</Card.Title>
				<Card.Description>
					Public lists of items you have and items you're looking for. Other traders can find you by these.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<HaveWantEditor
					items={(data.items ?? []) as any}
					currencies={(data.currencies ?? []) as any}
					initialHave={(data.lists?.have ?? []).map((e: any) => ({
						id: e.id,
						kind: e.kind,
						ref_id: e.kind === 'item' ? e.item_id : e.currency_id,
						name: e.name,
						image_url: e.image_url,
						description: e.description,
					}))}
					initialWant={(data.lists?.want ?? []).map((e: any) => ({
						id: e.id,
						kind: e.kind,
						ref_id: e.kind === 'item' ? e.item_id : e.currency_id,
						name: e.name,
						image_url: e.image_url,
						description: e.description,
					}))}
				/>
			</Card.Content>
		</Card.Root>

		<!-- Notification preferences -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Notifications</Card.Title>
				<Card.Description>Choose which alerts you receive.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#each NOTIFICATION_TYPES as { key, label, description: desc }, i}
					<div class="flex items-center justify-between gap-4">
						<div class="flex-1">
							<Label class="text-sm font-medium">{label}</Label>
							<p class="text-xs text-muted-foreground">{desc}</p>
						</div>
						<Switch bind:checked={notificationPrefs[key]} />
					</div>
					{#if i < NOTIFICATION_TYPES.length - 1}
						<Separator />
					{/if}
				{/each}
			</Card.Content>
		</Card.Root>

		<!-- Sticky save bar -->
		<div class="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-lg">
			<div class="flex items-center gap-2">
				{#if isDirty}
					<Badge variant="secondary">Unsaved changes</Badge>
				{:else}
					<span class="text-sm text-muted-foreground">All changes saved</span>
				{/if}
			</div>
			<Button type="submit" disabled={!isDirty || saving || availabilityState === 'taken' || availabilityState === 'invalid'}>
				{#if saving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Save changes
				{/if}
			</Button>
		</div>
	</form>
</div>
