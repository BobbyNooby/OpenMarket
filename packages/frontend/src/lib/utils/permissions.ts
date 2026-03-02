export type BanInfo = {
	reason: string | null;
	bannedAt: string;
	expiresAt: string | null;
	bannedBy: string;
};

export type Session = {
	user: { id: string; name: string; email: string; image?: string | null } | null;
	permissions: string[];
	roles: string[];
	ban: BanInfo | null;
} | null;

export function hasPermission(session: Session, permission: string): boolean {
	return session?.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(session: Session, permissions: string[]): boolean {
	return permissions.some((p) => hasPermission(session, p));
}

export function hasAllPermissions(session: Session, permissions: string[]): boolean {
	return permissions.every((p) => hasPermission(session, p));
}

export function createPermissionChecker(session: Session) {
	return {
		can: (permission: string) => hasPermission(session, permission),
		canAny: (permissions: string[]) => hasAnyPermission(session, permissions),
		canAll: (permissions: string[]) => hasAllPermissions(session, permissions),

		get isLoggedIn() {
			return session?.user !== null;
		},
		get canModerate() {
			return hasAnyPermission(session, ['listing:moderate', 'review:moderate', 'user:ban']);
		},
		get canManageItems() {
			return hasAnyPermission(session, ['item:create', 'item:update', 'item:delete']);
		},
		get canManageCurrencies() {
			return hasAnyPermission(session, ['currency:create', 'currency:update', 'currency:delete']);
		},
		get canAccessAdmin() {
			return hasAnyPermission(session, ['admin:users', 'admin:roles']);
		},
		get isBanned() {
			return session?.ban != null;
		}
	};
}
