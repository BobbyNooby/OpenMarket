import { writable, derived } from 'svelte/store';

export type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem('theme-mode');
		if (saved === 'light' || saved === 'dark') return saved;

		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		}
	}
	return 'light';
}

const themeStore = writable<ThemeMode>(getInitialTheme());

export function setTheme(mode: ThemeMode): void {
	themeStore.set(mode);

	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', mode);
		localStorage.setItem('theme-mode', mode);
	}
}
export function toggleTheme(): void {
	themeStore.update((current) => (current === 'light' ? 'dark' : 'light'));

	if (typeof document !== 'undefined') {
		const newTheme =
			document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', newTheme);
		localStorage.setItem('theme-mode', newTheme);
	}
}

export function getTheme(): ThemeMode {
	let current: ThemeMode = 'light';
	themeStore.subscribe((value) => {
		current = value;
	})();
	return current;
}

// Use this in components to access theme state
export function useTheme() {
	const currentTheme = writable<ThemeMode>('light');

	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem('theme-mode') as ThemeMode | null;
		if (saved) {
			currentTheme.set(saved);
		} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			currentTheme.set('dark');
		}

		// sync theme across tabs
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === 'theme-mode' && (e.newValue === 'light' || e.newValue === 'dark')) {
				currentTheme.set(e.newValue);
			}
		};

		window.addEventListener('storage', handleStorageChange);

		return {
			theme: currentTheme,
			setTheme,
			toggleTheme,
			subscribe: currentTheme.subscribe
		};
	}

	return {
		theme: currentTheme,
		setTheme,
		toggleTheme,
		subscribe: currentTheme.subscribe
	};
}
