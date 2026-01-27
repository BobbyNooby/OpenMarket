<script lang="ts">
	interface Option {
		value: string | number;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		options: Option[];
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		label?: string;
		id?: string;
		name?: string;
		required?: boolean;
		class?: string;
		onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
	}

	let {
		options,
		value = $bindable(''),
		placeholder = 'Select an option',
		disabled = false,
		error = '',
		label = '',
		id = '',
		name = '',
		required = false,
		class: className = '',
		onchange,
		...rest
	}: Props = $props();

	const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;

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
		cursor-pointer
		${error ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]' : 'border-[var(--color-border)]'}
		${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--color-disabled)]' : ''}
		${className}
	`;
</script>

{#if label}
	<label for={selectId} class="mb-1 block text-sm font-semibold text-[var(--color-text)]">
		{label}
		{#if required}
			<span class="text-[var(--color-error)]">*</span>
		{/if}
	</label>
{/if}

<select
	bind:value
	{disabled}
	{required}
	id={selectId}
	name={name || selectId}
	class={baseStyles}
	{onchange}
	{...rest}
>
	{#if placeholder}
		<option value="" disabled selected>{placeholder}</option>
	{/if}
	{#each options as option}
		<option value={option.value} disabled={option.disabled}>
			{option.label}
		</option>
	{/each}
</select>

{#if error}
	<p class="mt-1 text-xs text-[var(--color-error)]">{error}</p>
{/if}
