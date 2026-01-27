<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		id?: string;
		name?: string;
		class?: string;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		checked = $bindable(false),
		disabled = false,
		label = '',
		id = '',
		name = '',
		class: className = '',
		onchange,
		...rest
	}: Props = $props();

	const toggleId = id || name || `toggle-${Math.random().toString(36).substr(2, 9)}`;

	const containerStyles = `
		relative
		inline-block
		w-11
		h-6
		${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
	`;

	const trackStyles = `
		absolute
		top-0
		left-0
		right-0
		bottom-0
		rounded-[var(--radius-full)]
		transition-all
		duration-100
		${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}
	`;

	const thumbStyles = `
		absolute
		top-1
		left-1
		w-4
		h-4
		bg-white
		rounded-[var(--radius-full)]
		transition-all
		duration-100
		shadow-sm
		${checked ? 'translate-x-5' : 'translate-x-0'}
	`;
</script>

<div class="flex items-center gap-3 {className}">
	<label for={toggleId} class={containerStyles}>
		<input
			type="checkbox"
			bind:checked
			{disabled}
			id={toggleId}
			name={name || toggleId}
			class="sr-only"
			{onchange}
			{...rest}
		/>
		<span class={trackStyles}></span>
		<span class={thumbStyles}></span>
	</label>
	{#if label}
		<label for={toggleId} class="text-sm text-[var(--color-text)] {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}">
			{label}
		</label>
	{/if}
</div>
