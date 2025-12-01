<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'search';
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		label?: string;
		id?: string;
		name?: string;
		required?: boolean;
		class?: string;
		oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		error = '',
		label = '',
		id = '',
		name = '',
		required = false,
		class: className = '',
		oninput,
		onchange,
		...rest
	}: Props = $props();

	const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;

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
		${error ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]' : 'border-[var(--color-border)]'}
		${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--color-disabled)]' : ''}
		${className}
	`;
</script>

{#if label}
	<label for={inputId} class="mb-1 block text-sm font-semibold text-[var(--color-text)]">
		{label}
		{#if required}
			<span class="text-[var(--color-error)]">*</span>
		{/if}
	</label>
{/if}

<input
	{type}
	bind:value
	{placeholder}
	{disabled}
	{required}
	id={inputId}
	name={name || inputId}
	class={baseStyles}
	{oninput}
	{onchange}
	{...rest}
/>

{#if error}
	<p class="mt-1 text-xs text-[var(--color-error)]">{error}</p>
{/if}
