<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import Loader2 from '@lucide/svelte/icons/loader';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, setLocale } from '$lib/paraglide/runtime.js';

	let selected = $state<'en' | 'es'>(getLocale() === 'es' ? 'es' : 'en');
	let saving = $state(false);

	async function handleSave() {
		saving = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/users/language`, {
				method: 'PUT',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ language: selected }),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error ?? 'Failed to save');

			toast.success(m.settings_language_updated());
			// setLocale writes the cookie + reloads so SSR picks up the new locale
			setLocale(selected);
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to save');
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-foreground">{m.settings_language_title()}</h1>
		<p class="text-muted-foreground">{m.settings_language_subtitle()}</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.settings_language_title()}</Card.Title>
			<Card.Description>{m.settings_language_description()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<RadioGroup.Root bind:value={selected} class="space-y-3">
				<div class="flex items-center gap-3 rounded-md border border-border p-3">
					<RadioGroup.Item value="en" id="lang-en" />
					<Label for="lang-en" class="flex-1 cursor-pointer">
						{m.settings_language_english()} <span class="text-muted-foreground">— {m.language_english_native()}</span>
					</Label>
				</div>
				<div class="flex items-center gap-3 rounded-md border border-border p-3">
					<RadioGroup.Item value="es" id="lang-es" />
					<Label for="lang-es" class="flex-1 cursor-pointer">
						{m.settings_language_spanish()} <span class="text-muted-foreground">— {m.language_spanish_native()}</span>
					</Label>
				</div>
			</RadioGroup.Root>

			<div class="mt-4 flex justify-end">
				<Button onclick={handleSave} disabled={saving}>
					{#if saving}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{m.button_saving()}
					{:else}
						{m.button_save_changes()}
					{/if}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
