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

// JSON POST/PUT/PATCH helper
export async function apiJson(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) {
	return apiFetch(path, {
		method,
		...(body !== undefined && {
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	});
}

// Ban/warn/unban helpers
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

// Report types
export interface AdminReport {
	id: string;
	target_type: 'listing' | 'review' | 'user';
	target_id: string;
	reason: string;
	status: 'pending' | 'resolved' | 'dismissed';
	created_at: string;
	resolved_at: string | null;
	reporter: {
		id: string;
		name: string;
		image?: string;
		username: string;
	};
	resolved_by: {
		id: string;
		name: string;
		username: string | null;
	} | null;
	report_count: number;
}

// Report helpers
export async function getReports(params: { limit?: number; offset?: number; status?: string }) {
	const searchParams = new URLSearchParams();
	if (params.limit) searchParams.set('limit', params.limit.toString());
	if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());
	if (params.status) searchParams.set('status', params.status);
	return apiFetch(`/admin/reports?${searchParams}`);
}

export async function updateReportStatus(reportId: string, status: 'resolved' | 'dismissed') {
	return apiJson(`/admin/reports/${reportId}`, 'PATCH', { status });
}

// Moderation log types
export interface ModerationEvent {
	id: string;
	event_type: 'report' | 'ban' | 'warning';
	reason: string | null;
	created_at: string;
	status: string | null;
	actor: {
		id: string;
		name: string;
		username: string;
		image?: string;
	};
	target_type: string;
	target_id: string;
	target_name: string;
	expires_at: string | null;
}

export async function getModerationLog(params: { limit?: number; offset?: number; type?: string }) {
	const searchParams = new URLSearchParams();
	if (params.limit) searchParams.set('limit', params.limit.toString());
	if (params.offset !== undefined) searchParams.set('offset', params.offset.toString());
	if (params.type) searchParams.set('type', params.type);
	return apiFetch(`/admin/moderation-log?${searchParams}`);
}
