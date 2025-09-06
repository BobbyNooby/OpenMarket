import { get, writable, type Writable } from 'svelte/store';
import { darkTheme, lightTheme, type Theme } from './themes';

function createThemeStore() {
	const themes: Theme[] = [darkTheme, lightTheme];
	const theme: Writable<Theme> = writable(themes[0]);
	const STORAGE_KEY = 'theme';

	function cycleTheme() {
		const nextIndex = (themes.indexOf(get(theme)) + 1) % themes.length;
		setTheme(themes[nextIndex]);
	}

	function setTheme(chosen: Theme) {
		theme.set(chosen);
		cacheTheme();
	}

	function initializeTheme() {
		if (typeof window === 'undefined') return; // 🚫 SSR safe-guard

		const storedTheme = localStorage.getItem(STORAGE_KEY);
		if (storedTheme) {
			try {
				const parsed = JSON.parse(storedTheme) as Partial<Theme>;
				const valid = parsed?.name && themes.find((t) => t.name === parsed.name);

				if (valid) {
					theme.set(valid);
				} else {
					throw new Error('Invalid theme name');
				}
			} catch (error) {
				console.error('Error parsing stored theme:', error);
				localStorage.removeItem(STORAGE_KEY);
				theme.set(themes[0]);
				cacheTheme();
			}
		}
	}

	function cacheTheme() {
		if (typeof window === 'undefined') return; // 🚫 SSR safe-guard
		localStorage.setItem(STORAGE_KEY, JSON.stringify(get(theme)));
	}

	return {
		theme,
		cycleTheme,
		setTheme,
		cacheTheme,
		initializeTheme
	};
}

export const useTheme = createThemeStore();
