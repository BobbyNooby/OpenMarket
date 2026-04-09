<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { uploadImage, resolveUploadUrl } from '$lib/utils/upload';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	interface Props {
		value?: string;
		label?: string;
		aspect?: 'square' | 'video' | 'auto';
		class?: string;
	}

	let { value = $bindable(''), label = '', aspect = 'auto', class: className = '' }: Props = $props();

	const aspectClass = $derived(
		aspect === 'square' ? 'aspect-square' :
		aspect === 'video' ? 'aspect-video' :
		''
	);

	let uploading = $state(false);
	let error = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	// Resolve relative /uploads/... paths to full URLs for display
	const previewSrc = $derived(value ? resolveUploadUrl(value) : '');

	async function handleFile(file: File) {
		uploading = true;
		error = '';
		const result = await uploadImage(file);
		if (result.success) {
			value = result.data.url;
		} else {
			error = result.error;
		}
		uploading = false;
	}

	function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
		input.value = '';
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/')) handleFile(file);
	}

	function clear() {
		value = '';
		error = '';
	}
</script>

<div class="space-y-2 {className}">
	{#if label}
		<p class="text-sm font-medium text-foreground">{label}</p>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative flex min-h-30 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary/50"
		ondragover={(e) => e.preventDefault()}
		ondrop={onDrop}
	>
		{#if uploading}
			<div class="flex flex-col items-center gap-2 py-4 text-muted-foreground">
				<Loader2 class="h-6 w-6 animate-spin" />
				<span class="text-xs">Uploading...</span>
			</div>
		{:else if previewSrc}
			<div class="relative w-full p-2">
				<img
					src={previewSrc}
					alt="Uploaded"
					class="mx-auto max-h-40 rounded-md object-cover {aspectClass}"
				/>
				<Button
					type="button"
					variant="destructive"
					size="icon"
					class="absolute right-2 top-2 h-6 w-6"
					onclick={clear}
				>
					<X class="h-3.5 w-3.5" />
				</Button>
			</div>
		{:else}
			<button
				type="button"
				class="flex w-full cursor-pointer flex-col items-center gap-2 py-6 text-muted-foreground"
				onclick={() => inputEl?.click()}
			>
				<Upload class="h-6 w-6" />
				<span class="text-xs">Click or drag an image here</span>
				<span class="text-xs text-muted-foreground/60">JPEG, PNG, or WebP (max 5MB)</span>
			</button>
		{/if}
	</div>

	{#if previewSrc && !uploading}
		<Button type="button" variant="outline" size="sm" onclick={() => inputEl?.click()}>
			Change image
		</Button>
	{/if}

	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}

	<input
		bind:this={inputEl}
		type="file"
		accept="image/jpeg,image/png,image/webp"
		class="hidden"
		onchange={onFileChange}
	/>
</div>
