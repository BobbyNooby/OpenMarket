import type { Handle } from '@sveltejs/kit';
import type { ThemeName } from '$lib/design/themes';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { auth } from '$lib/auth/auth';

function readThemeCookie(cookieHeader: string | null): ThemeName | null {
	if (!cookieHeader) return null;
	const m = cookieHeader.match(/(?:^|;\s*)theme=([^;]+)/);
	const v = m ? decodeURIComponent(m[1]) : null;
	return v === 'dark' || v === 'light' ? v : null;
}

export const handle: Handle = async ({ event, resolve }) => {
	const cookieTheme = readThemeCookie(event.request.headers.get('cookie'));
	const theme: ThemeName = cookieTheme ?? 'dark';
	event.locals.themeName = theme;

	return svelteKitHandler({
		event,
		resolve: (event) =>
			resolve(event, {
				transformPageChunk: ({ html }) => html.replace('<html', `<html data-theme="${theme}"`)
			}),
		auth,
		building
	});
};
