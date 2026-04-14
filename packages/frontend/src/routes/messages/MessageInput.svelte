<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import SendHorizontal from '@lucide/svelte/icons/send-horizontal';
	import { wsManager } from '$lib/stores/ws.svelte';

	interface Props {
		conversationId: string;
		onSend: (content: string) => void;
		disabled?: boolean;
	}

	let { conversationId, onSend, disabled = false }: Props = $props();

	let content = $state('');
	let textareaEl: HTMLTextAreaElement | null = $state(null);
	let typingTimeout: ReturnType<typeof setTimeout> | null = null;
	let isTyping = false;

	const canSend = $derived(content.trim().length > 0 && !disabled);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function send() {
		if (!canSend) return;
		onSend(content);
		content = '';
		stopTyping();
		// Reset textarea height
		if (textareaEl) textareaEl.style.height = 'auto';
		textareaEl?.focus();
	}

	function handleInput() {
		// Auto-resize textarea
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + 'px';
		}

		// Typing indicator
		if (!isTyping) {
			isTyping = true;
			wsManager.sendTyping(conversationId);
		}

		if (typingTimeout) clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => {
			stopTyping();
		}, 3000);
	}

	function stopTyping() {
		if (isTyping) {
			isTyping = false;
			wsManager.sendStopTyping(conversationId);
		}
		if (typingTimeout) {
			clearTimeout(typingTimeout);
			typingTimeout = null;
		}
	}
</script>

<div class="border-t border-border px-4 py-3">
	<div class="flex items-end gap-2">
		<Textarea
			bind:ref={textareaEl}
			bind:value={content}
			placeholder="Type a message..."
			class="max-h-[120px] min-h-[40px] resize-none"
			rows={1}
			onkeydown={handleKeydown}
			oninput={handleInput}
			{disabled}
		/>
		<Button
			size="icon"
			class="h-10 w-10 flex-shrink-0"
			onclick={send}
			disabled={!canSend}
		>
			<SendHorizontal class="h-4 w-4" />
		</Button>
	</div>
</div>
