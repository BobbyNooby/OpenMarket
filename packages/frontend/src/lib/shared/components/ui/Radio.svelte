<script lang="ts">
	interface Props {
		group?: string | number;
		disabled?: boolean;
		label?: string;
		id?: string;
		name: string;
		value: string | number;
		class?: string;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		group = $bindable(),
		disabled = false,
		label = '',
		id = '',
		name,
		value,
		class: className = '',
		onchange,
		...rest
	}: Props = $props();

	const radioId = id || `radio-${value}-${Math.random().toString(36).substr(2, 9)}`;

	const radioStyles = `
		w-4
		h-4
		bg-[var(--color-background)]
		border
		border-[var(--color-border)]
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
		type="radio"
		bind:group
		{disabled}
		{value}
		{name}
		id={radioId}
		class={radioStyles}
		{onchange}
		{...rest}
	/>
	{#if label}
		<label for={radioId} class="text-sm text-[var(--color-text)] {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}">
			{label}
		</label>
	{/if}
</div>
