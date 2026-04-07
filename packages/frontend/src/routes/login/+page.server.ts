import { redirect } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const sessionToken = cookies.get('better-auth.session_token');
	
	if (sessionToken) {
		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/auth/get-session`, {
				headers: { Cookie: `better-auth.session_token=${sessionToken}` }
			});
			const data = await res.json();
			
			// If logged in and has profile, redirect to home
			if (data.user && data.hasProfile !== false) {
				redirect(302, '/');
			}
			// If logged in but no profile, redirect to onboarding
			if (data.user && data.hasProfile === false) {
				redirect(302, '/onboarding');
			}
		} catch {
			// Not logged in or error, continue to login page
		}
	}
	
	return {};
};