import { PUBLIC_API_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

// Server-side API base URL. In Docker, API_URL points to the internal service name
// (http://server:3000). In dev, falls back to PUBLIC_API_URL (http://localhost:3000).
export function getApiBase(): string {
	return env.API_URL || PUBLIC_API_URL;
}

// Server-side fetch that always hits the API, never the frontend itself.
// Use this in +page.server.ts and +layout.server.ts instead of SvelteKit's fetch.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const base = getApiBase();
	const url = path.startsWith('http') ? path : `${base}${path}`;
	return globalThis.fetch(url, init);
}
