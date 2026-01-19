import { writable, get, type Writable } from 'svelte/store';
import { THEME_MAP, type Theme, type ThemeName } from '$lib/design/themes';

const STORAGE_KEY = 'theme';
const COOKIE_KEY = 'theme';

const theme: Writable<Theme> = writable(THEME_MAP.dark);

function writeCookieAndAttr(t: Theme) {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-theme', t.name);
	document.cookie = `${COOKIE_KEY}=${encodeURIComponent(t.name)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function writeLocalStorage(t: Theme) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
	localStorage.setItem('theme-mode', t.name); // sync with cssVariables
}

export function setTheme(next: Theme) {
	theme.set(next);
	writeCookieAndAttr(next);
	writeLocalStorage(next);
}

export function toggleTheme() {
	const current = get(theme);
	const nextName: ThemeName = current.name === 'dark' ? 'light' : 'dark';
	setTheme(THEME_MAP[nextName]);
}

// Call this in +layout.svelte with SSR theme
export function hydrateThemeFromSSR(ssrTheme: Theme) {
	theme.set(ssrTheme);
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', ssrTheme.name);
	}
}

export { theme };
