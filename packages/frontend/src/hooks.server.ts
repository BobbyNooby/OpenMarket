import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server.js';

type ThemeMode = 'light' | 'dark';

function readThemeCookie(cookieHeader: string | null): ThemeMode | null {
	if (!cookieHeader) return null;
	const m = cookieHeader.match(/(?:^|;\s*)theme-mode=([^;]+)/);
	const v = m ? decodeURIComponent(m[1]) : null;
	return v === 'dark' || v === 'light' ? v : null;
}

const handleTheme: Handle = async ({ event, resolve }) => {
	const theme: ThemeMode = readThemeCookie(event.request.headers.get('cookie')) ?? 'dark';
	event.locals.themeName = theme;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('<html', `<html class="${theme === 'dark' ? 'dark' : ''}"`)
	});
};

// Wrap the SvelteKit pipeline in paraglide's middleware so SSR resolves the
// active locale per-request from the cookie + AsyncLocalStorage context.
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		event.locals.locale = locale;
		return handleTheme({ event, resolve });
	});

export const handle: Handle = handleParaglide;
