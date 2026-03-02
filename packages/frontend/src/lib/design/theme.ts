import { writable, get } from 'svelte/store';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';

export const themeMode = writable<ThemeMode>('dark');

function applyTheme(mode: ThemeMode) {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function setTheme(mode: ThemeMode) {
	themeMode.set(mode);
	applyTheme(mode);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, mode);
	}
}

export function toggleTheme() {
	const current = get(themeMode);
	setTheme(current === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
	if (typeof localStorage === 'undefined') return;
	const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';
	setTheme(saved);
}
