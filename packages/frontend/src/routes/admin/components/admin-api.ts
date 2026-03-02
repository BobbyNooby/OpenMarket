import { PUBLIC_API_URL } from '$env/static/public';

// Shared types
export interface AdminUser {
	id: string;
	name: string;
	email: string;
	image?: string;
	username: string;
	created_at: string;
	roles: string[];
	is_banned: boolean;
}

export interface Role {
	id: string;
	name: string;
	description: string;
}

export interface Permission {
	id: string;
	name: string;
	description: string;
}

export interface RoleDetail extends Role {
	permissions: string[];
}

export const DEFAULT_ROLES = ['user', 'moderator', 'database-maintainer', 'admin'];

// Shared API fetch with credentials
export async function apiFetch(path: string, options?: RequestInit) {
	const res = await fetch(`${PUBLIC_API_URL}${path}`, {
		credentials: 'include',
		...options
	});
	return res.json();
}

// JSON POST/PUT helper
export async function apiJson(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
	return apiFetch(path, {
		method,
		...(body !== undefined && {
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	});
}
