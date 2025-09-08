import { writable, get, type Writable } from 'svelte/store';
import { THEME_MAP, type Theme, type ThemeName } from '$lib/design/themes';

const STORAGE_KEY = 'theme';
const COOKIE_KEY = 'theme';

const theme: Writable<Theme> = writable(THEME_MAP.dark); // SSR fallback

function writeCookieAndAttr(t: Theme) {
	if (typeof document === 'undefined') return;
	// reflect on <html> (keeps Tailwind/data-theme users happy)
	document.documentElement.setAttribute('data-theme', t.name);
	// 1 year cookie
	document.cookie = `${COOKIE_KEY}=${encodeURIComponent(t.name)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function writeLocalStorage(t: Theme) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
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

/** Call once in +layout.svelte with the SSR theme */
export function hydrateThemeFromSSR(ssrTheme: Theme) {
	theme.set(ssrTheme);
	// Ensure <html data-theme> reflects SSR theme after hydration
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', ssrTheme.name);
	}
}

export { theme };
