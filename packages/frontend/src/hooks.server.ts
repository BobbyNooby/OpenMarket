import type { Handle } from '@sveltejs/kit';

type ThemeMode = 'light' | 'dark';

function readThemeCookie(cookieHeader: string | null): ThemeMode | null {
	if (!cookieHeader) return null;
	const m = cookieHeader.match(/(?:^|;\s*)theme-mode=([^;]+)/);
	const v = m ? decodeURIComponent(m[1]) : null;
	return v === 'dark' || v === 'light' ? v : null;
}

export const handle: Handle = async ({ event, resolve }) => {
	const theme: ThemeMode = readThemeCookie(event.request.headers.get('cookie')) ?? 'dark';
	event.locals.themeName = theme;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('<html', `<html class="${theme === 'dark' ? 'dark' : ''}"`)
	});
};
