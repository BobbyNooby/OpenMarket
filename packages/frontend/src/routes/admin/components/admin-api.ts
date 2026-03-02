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

export interface BanHistoryEntry {
	id: string;
	type: 'ban';
	reason: string | null;
	bannedAt: string;
	expiresAt: string | null;
	issuedBy: { id: string; name: string };
	isActive: boolean;
}

export interface WarningHistoryEntry {
	id: string;
	type: 'warning';
	reason: string;
	createdAt: string;
	issuedBy: { id: string; name: string };
}

export interface UserHistory {
	bans: BanHistoryEntry[];
	warnings: WarningHistoryEntry[];
}

export const DEFAULT_ROLES = ['user', 'moderator', 'database-maintainer', 'admin'];

export async function apiFetch(path: string, options?: RequestInit) {
	const res = await fetch(`${PUBLIC_API_URL}${path}`, {
		credentials: 'include',
		...options
	});
	if (!res.ok) {
		return { success: false, error: `HTTP ${res.status}` };
	}
	return res.json();
}

export async function apiJson(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
	return apiFetch(path, {
		method,
		...(body !== undefined && {
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	});
}

export async function banUser(userId: string, reason: string, expiresAt?: string) {
	return apiJson(`/admin/users/${userId}/ban`, 'POST', { reason, expiresAt });
}

export async function unbanUser(userId: string) {
	return apiJson(`/admin/users/${userId}/ban`, 'DELETE');
}

export async function warnUser(userId: string, reason: string) {
	return apiJson(`/admin/users/${userId}/warn`, 'POST', { reason });
}

export async function getUserHistory(userId: string): Promise<{ success: boolean; data?: UserHistory }> {
	return apiFetch(`/admin/users/${userId}/history`);
}
