// Username validation for profile settings and future registration flow
// Rules: lowercase alphanumerics + underscore, 3-20 chars, no leading/trailing underscore

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const RESERVED_USERNAMES = new Set([
	'admin',
	'moderator',
	'system',
	'api',
	'null',
	'undefined',
]);

export interface UsernameValidation {
	valid: boolean;
	error?: string;
}

export function validateUsername(username: string): UsernameValidation {
	if (!username) return { valid: false, error: 'Username is required' };
	if (username !== username.toLowerCase()) {
		return { valid: false, error: 'Username must be lowercase' };
	}
	if (!USERNAME_PATTERN.test(username)) {
		return { valid: false, error: 'Username must be 3-20 characters (a-z, 0-9, _)' };
	}
	if (username.startsWith('_') || username.endsWith('_')) {
		return { valid: false, error: 'Username cannot start or end with an underscore' };
	}
	if (RESERVED_USERNAMES.has(username)) {
		return { valid: false, error: 'That username is reserved' };
	}
	return { valid: true };
}
