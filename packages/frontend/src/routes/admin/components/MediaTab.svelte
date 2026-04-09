<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { resolveUploadUrl, uploadImage } from '$lib/utils/upload';
	import { apiFetch, apiJson } from './admin-api';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Upload from '@lucide/svelte/icons/upload';

	interface UploadEntry {
		id: string;
		filename: string;
		url: string;
		size_bytes: number;
		width: number;
		height: number;
		created_at: string;
		username: string | null;
	}

	interface UploadDetail extends UploadEntry {
		uploader: { name: string; username: string | null } | null;
		references: {
			items: { id: string; name: string }[];
			currencies: { id: string; name: string }[];
			avatars: { user_id: string; username: string }[];
			site_config: { key: string }[];
			site_assets: { slot: string }[];
			total: number;
		};
	}

	let uploads = $state<UploadEntry[]>([]);
	let loading = $state(true);
	let stats = $state({ count: 0, total_bytes: 0 });

	let selectedId = $state<string | null>(null);
	let detail = $state<UploadDetail | null>(null);
	let detailLoading = $state(false);

	let deleteDialogOpen = $state(false);
	let deleting = $state(false);
	let cleaningUp = $state(false);
	let uploading = $state(false);
	let fileInputEl: HTMLInputElement | undefined = $state();

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric', month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit',
		});
	}

	async function loadUploads() {
		loading = true;
		const result = await apiFetch('/admin/media?limit=100');
		if (result.success) {
			uploads = result.data;
		}
		const statsResult = await apiFetch('/admin/media/stats');
		if (statsResult.success) stats = statsResult.data;
		loading = false;
	}

	async function loadDetail(id: string) {
		selectedId = id;
		detailLoading = true;
		const result = await apiFetch(`/admin/media/${id}`);
		if (result.success) detail = result.data;
		detailLoading = false;
	}

	async function handleDelete() {
		if (!detail) return;
		deleting = true;
		const result = await apiJson(`/admin/media/${detail.id}`, 'DELETE');
		if (result.success) {
			toast.success(m.admin_media_deleted());
			selectedId = null;
			detail = null;
			deleteDialogOpen = false;
			await loadUploads();
		} else {
			toast.error(result.error || m.admin_media_delete_error());
		}
		deleting = false;
	}

	async function handleCleanup() {
		if (!confirm(m.admin_media_cleanup_confirm())) return;
		cleaningUp = true;
		const result = await apiJson('/admin/media/cleanup-orphans', 'POST');
		if (result.success) {
			if (result.deleted > 0) {
				toast.success(m.admin_media_cleanup_success({ count: result.deleted }));
				await loadUploads();
			} else {
				toast.info(m.admin_media_cleanup_none());
			}
		}
		cleaningUp = false;
	}

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';
		uploading = true;
		const result = await uploadImage(file);
		if (result.success) {
			toast.success(m.admin_media_deleted().replace('deleted', 'uploaded'));
			await loadUploads();
		} else {
			toast.error(result.error);
		}
		uploading = false;
	}

	$effect(() => {
		loadUploads();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-xl font-semibold text-foreground">{m.admin_media_title()}</h2>
			<p class="text-sm text-muted-foreground">{m.admin_media_subtitle()}</p>
		</div>
		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-foreground">
				{m.admin_media_total_files({ count: stats.count })} · {m.admin_media_total_size({ size: formatBytes(stats.total_bytes) })}
			</span>
			<Button variant="outline" size="sm" onclick={handleCleanup} disabled={cleaningUp}>
				{#if cleaningUp}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{m.admin_media_cleanup()}
			</Button>
			<Button size="sm" onclick={() => fileInputEl?.click()} disabled={uploading}>
				{#if uploading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<Upload class="mr-2 h-4 w-4" />
				{/if}
				Upload
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	{:else if uploads.length === 0}
		<div class="flex flex-col items-center gap-3 py-16 text-muted-foreground">
			<ImageIcon class="h-10 w-10 opacity-50" />
			<p>{m.admin_media_no_uploads()}</p>
			<Button variant="outline" onclick={() => fileInputEl?.click()}>
				<Upload class="mr-2 h-4 w-4" />
				Upload
			</Button>
		</div>
	{:else}
		<div class="flex gap-6">
			<!-- Grid -->
			<div class="flex-1">
				<div class="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
					{#each uploads as upload}
						<button
							type="button"
							class="group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors
								{selectedId === upload.id ? 'border-primary' : 'border-border hover:border-primary/50'}"
							onclick={() => loadDetail(upload.id)}
						>
							<img
								src={resolveUploadUrl(upload.url)}
								alt={upload.filename}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
						</button>
					{/each}
				</div>
			</div>

			<!-- Detail pane -->
			{#if selectedId}
				<div class="w-72 shrink-0">
					<Card.Root>
						<Card.Content class="space-y-4 p-4">
							{#if detailLoading}
								<div class="flex justify-center py-8">
									<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
								</div>
							{:else if detail}
								<img
									src={resolveUploadUrl(detail.url)}
									alt={detail.filename}
									class="w-full rounded-md object-cover"
								/>

								<div class="space-y-1 text-sm">
									<p class="font-mono text-xs text-muted-foreground break-all">{detail.filename}</p>
									<p>{detail.width} x {detail.height} · {formatBytes(detail.size_bytes)}</p>
									<p class="text-muted-foreground">{formatDate(detail.created_at)}</p>
									{#if detail.uploader}
										<p class="text-muted-foreground">
											{m.admin_media_uploaded_by({ user: detail.uploader.username ?? detail.uploader.name })}
										</p>
									{/if}
								</div>

								{#if detail.references.total > 0}
									<div class="space-y-2">
										<p class="text-sm font-medium">{m.admin_media_refs_title()}</p>
										{#if detail.references.items.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each detail.references.items as item}
													<Badge variant="secondary">{item.name}</Badge>
												{/each}
											</div>
										{/if}
										{#if detail.references.currencies.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each detail.references.currencies as curr}
													<Badge variant="secondary">{curr.name}</Badge>
												{/each}
											</div>
										{/if}
										{#if detail.references.avatars.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each detail.references.avatars as av}
													<Badge variant="outline">@{av.username}</Badge>
												{/each}
											</div>
										{/if}
										{#if detail.references.site_config.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each detail.references.site_config as sc}
													<Badge variant="outline">{sc.key}</Badge>
												{/each}
											</div>
										{/if}
									</div>
								{/if}

								<Button
									variant="destructive"
									size="sm"
									class="w-full"
									onclick={() => { deleteDialogOpen = true; }}
								>
									<Trash2 class="mr-2 h-4 w-4" />
									{m.admin_media_delete()}
								</Button>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Hidden file input -->
<input
	bind:this={fileInputEl}
	type="file"
	accept="image/jpeg,image/png,image/webp"
	class="hidden"
	onchange={handleUpload}
/>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.admin_media_delete_confirm_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{#if detail && detail.references.total > 0}
					{m.admin_media_delete_confirm_refs({ count: detail.references.total })}
				{:else}
					{m.admin_media_delete_confirm_orphan()}
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.button_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleDelete} disabled={deleting}>
				{#if deleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{m.admin_media_delete()}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
