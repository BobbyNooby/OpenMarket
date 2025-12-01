<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		id?: string;
		name?: string;
		value?: string;
		class?: string;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		checked = $bindable(false),
		disabled = false,
		label = '',
		id = '',
		name = '',
		value = '',
		class: className = '',
		onchange,
		...rest
	}: Props = $props();

	const checkboxId = id || name || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

	const checkboxStyles = `
		w-4
		h-4
		bg-[var(--color-background)]
		border
		border-[var(--color-border)]
		rounded-[var(--radius-sm)]
		text-[var(--color-primary)]
		focus:ring-2
		focus:ring-[var(--color-primary)]
		focus:ring-offset-1
		transition-all
		duration-100
		cursor-pointer
		${disabled ? 'opacity-50 cursor-not-allowed' : ''}
	`;
</script>

<div class="flex items-center gap-2 {className}">
	<input
		type="checkbox"
		bind:checked
		{disabled}
		{value}
		id={checkboxId}
		name={name || checkboxId}
		class={checkboxStyles}
		{onchange}
		{...rest}
	/>
	{#if label}
		<label for={checkboxId} class="text-sm text-[var(--color-text)] {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}">
			{label}
		</label>
	{/if}
</div>
