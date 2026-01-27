<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		children?: any;
		class?: string;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		children,
		class: className = '',
		...rest
	}: Props = $props();

	const sizeMap = {
		sm: 'px-[var(--space-3)] py-[var(--space-1)] text-sm font-semibold',
		md: 'px-[var(--space-4)] py-[var(--space-2)] text-base font-semibold',
		lg: 'px-[var(--space-6)] py-[var(--space-3)] text-lg font-semibold'
	};

	const variantMap = {
		primary: 'bg-[var(--color-primary)] text-white hover:opacity-90 active:opacity-75',
		secondary:
			'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-disabled)]',
		danger: 'bg-[var(--color-error)] text-white hover:opacity-90 active:opacity-75'
	};

	const styles = `
		${sizeMap[size]}
		${variantMap[variant]}
		${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
		rounded-[var(--radius-md)]
		focus:outline-none
		focus:ring-2
		focus:ring-[var(--color-primary)]
		focus:ring-offset-2
		leading-tight
		tracking-wide
		${className}
	`;
</script>

<button {type} {disabled} class={styles} {...rest}>
	{#if children}
		{@render children()}
	{/if}
</button>
