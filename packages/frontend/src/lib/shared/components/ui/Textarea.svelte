<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		label?: string;
		id?: string;
		name?: string;
		required?: boolean;
		rows?: number;
		class?: string;
		oninput?: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
		onchange?: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
	}

	let {
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		error = '',
		label = '',
		id = '',
		name = '',
		required = false,
		rows = 4,
		class: className = '',
		oninput,
		onchange,
		...rest
	}: Props = $props();

	const textareaId = id || name || `textarea-${Math.random().toString(36).substr(2, 9)}`;

	const baseStyles = `
		w-full
		px-[var(--space-3)]
		py-[var(--space-2)]
		bg-[var(--color-background)]
		text-[var(--color-text)]
		border
		rounded-[var(--radius-md)]
		text-sm
		focus:outline-none
		focus:ring-2
		focus:ring-[var(--color-primary)]
		focus:ring-offset-1
		transition-all
		duration-100
		resize-vertical
		${error ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]' : 'border-[var(--color-border)]'}
		${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--color-disabled)]' : ''}
		${className}
	`;
</script>

{#if label}
	<label for={textareaId} class="mb-1 block text-sm font-semibold text-[var(--color-text)]">
		{label}
		{#if required}
			<span class="text-[var(--color-error)]">*</span>
		{/if}
	</label>
{/if}

<textarea
	bind:value
	{placeholder}
	{disabled}
	{required}
	{rows}
	id={textareaId}
	name={name || textareaId}
	class={baseStyles}
	{oninput}
	{onchange}
	{...rest}
></textarea>

{#if error}
	<p class="mt-1 text-xs text-[var(--color-error)]">{error}</p>
{/if}
