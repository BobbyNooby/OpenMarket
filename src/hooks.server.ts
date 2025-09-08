import type { Handle } from '@sveltejs/kit';
import type { ThemeName } from '$lib/design/themes';
import { handle as handleAuth } from '$lib/auth';

function readThemeCookie(cookieHeader: string | null): ThemeName | null {
	if (!cookieHeader) return null;
	const m = cookieHeader.match(/(?:^|;\s*)theme=([^;]+)/);
	const v = m ? decodeURIComponent(m[1]) : null;
	return v === 'dark' || v === 'light' ? v : null;
}

export const handle: Handle = async ({ event, resolve }) => {
	handleAuth({ event, resolve });
	const cookieTheme = readThemeCookie(event.request.headers.get('cookie'));
	const theme: ThemeName = cookieTheme ?? 'dark'; // ← default
	event.locals.themeName = theme;

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('<html', `<html data-theme="${theme}"`)
	});
};
