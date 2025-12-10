<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		open?: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		closable?: boolean;
		closeOnBackdrop?: boolean;
		class?: string;
		children?: any;
		footer?: any;
		onClose?: () => void;
	}

	let {
		open = $bindable(false),
		title = '',
		size = 'md',
		closable = true,
		closeOnBackdrop = true,
		class: className = '',
		children,
		footer,
		onClose
	}: Props = $props();

	const sizeMap = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl',
		xl: 'max-w-6xl'
	};

	function handleClose() {
		open = false;
		onClose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (closeOnBackdrop && e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && closable) {
			handleClose();
		}
	}

	onMount(() => {
		if (open) {
			document.addEventListener('keydown', handleKeydown);
		}

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		console.log('Modal open state changed:', open);
		if (open) {
			document.addEventListener('keydown', handleKeydown);
			document.body.style.overflow = 'hidden';
		} else {
			document.removeEventListener('keydown', handleKeydown);
			document.body.style.overflow = '';
		}
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if open}
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="fixed inset-0 z-[1000] flex items-center justify-center p-4 transition-opacity duration-200"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/50 transition-opacity duration-200"></div>

		<!-- Modal Container -->
		<div
			class="relative w-full {sizeMap[size]} animate-in fade-in zoom-in-95 duration-200 {className}"
		>
			<div
				class="relative flex max-h-[90vh] flex-col rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-2xl)]"
			>
				<!-- Header -->
				{#if title || closable}
					<div
						class="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4"
					>
						{#if title}
							<h2 id="modal-title" class="text-xl font-semibold text-[var(--color-text)]">
								{title}
							</h2>
						{/if}
						{#if closable}
							<button
								type="button"
								onclick={handleClose}
								class="ml-auto rounded-[var(--radius-md)] p-1 text-[var(--color-textSecondary)] transition-colors hover:bg-[var(--color-disabled)] hover:text-[var(--color-text)]"
								aria-label="Close modal"
							>
								<svg
									class="h-5 w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
							</button>
						{/if}
					</div>
				{/if}

				<!-- Body -->
				<div class="flex-1 overflow-y-auto px-6 py-4">
					{#if children}
						{@render children()}
					{/if}
				</div>

				<!-- Footer -->
				{#if footer}
					<div
						class="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4"
					>
						{@render footer()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes zoom-in-95 {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}

	.animate-in {
		animation:
			fade-in 0.2s ease-out,
			zoom-in-95 0.2s ease-out;
	}
</style>
