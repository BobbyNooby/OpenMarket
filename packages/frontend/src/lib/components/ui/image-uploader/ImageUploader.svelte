<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { uploadImage, resolveUploadUrl } from '$lib/utils/upload';
	import Upload from '@lucide/svelte/icons/upload';
	import ImageIcon from '@lucide/svelte/icons/image';
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

	// Library picker state
	let libraryOpen = $state(false);
	let libraryImages = $state<{ id: string; filename: string; url: string; width: number; height: number }[]>([]);
	let libraryLoading = $state(false);

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

	async function openLibrary() {
		libraryOpen = true;
		if (libraryImages.length > 0) return;
		libraryLoading = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/admin/media?limit=100`, { credentials: 'include' });
			const result = await res.json();
			if (result.success) libraryImages = result.data;
		} catch { /* ignore */ }
		libraryLoading = false;
	}

	function pickFromLibrary(img: typeof libraryImages[0]) {
		value = resolveUploadUrl(img.url);
		libraryOpen = false;
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

	<div class="flex gap-2">
		{#if previewSrc && !uploading}
			<Button type="button" variant="outline" size="sm" onclick={() => inputEl?.click()}>
				Change image
			</Button>
		{/if}
		<Button type="button" variant="outline" size="sm" onclick={openLibrary}>
			<ImageIcon class="mr-1.5 h-3.5 w-3.5" />
			Library
		</Button>
	</div>

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

<!-- Library picker dialog -->
<Dialog.Root bind:open={libraryOpen}>
	<Dialog.Content class="max-w-2xl max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Choose from library</Dialog.Title>
			<Dialog.Description>Select an existing image or upload a new one</Dialog.Description>
		</Dialog.Header>

		{#if libraryLoading}
			<div class="flex justify-center py-12">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else if libraryImages.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">No images in the library yet. Upload one first.</p>
		{:else}
			<div class="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
				{#each libraryImages as img}
					<button
						type="button"
						class="aspect-square overflow-hidden rounded-lg border-2 border-border transition-colors hover:border-primary"
						onclick={() => pickFromLibrary(img)}
					>
						<img
							src={resolveUploadUrl(img.url)}
							alt={img.filename}
							class="h-full w-full object-cover"
							loading="lazy"
						/>
					</button>
				{/each}
			</div>
		{/if}

		<div class="mt-4 flex justify-between border-t border-border pt-4">
			<Button type="button" variant="outline" size="sm" onclick={() => { libraryOpen = false; inputEl?.click(); }}>
				<Upload class="mr-1.5 h-3.5 w-3.5" />
				Upload new instead
			</Button>
			<Button type="button" variant="ghost" size="sm" onclick={() => { libraryOpen = false; }}>
				Cancel
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
