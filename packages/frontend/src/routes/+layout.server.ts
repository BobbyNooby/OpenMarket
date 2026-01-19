import type { LayoutServerLoad } from './$types';
import { THEME_MAP } from '$lib/design/themes';

// TODO: Auth will be handled by the API server
// Mock session for now - will be replaced with API calls
const mockSession = null;

export const load: LayoutServerLoad = async ({ locals }) => {
	const theme = THEME_MAP[locals.themeName ?? 'dark'];
	return {
		theme,
		session: mockSession
	};
};
