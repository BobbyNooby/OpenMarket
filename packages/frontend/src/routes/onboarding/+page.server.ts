import { redirect } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';

export const load = async ({ cookies, fetch }) => {
	const sessionToken = cookies.get('better-auth.session_token');
	
	if (!sessionToken) {
		redirect(302, '/login');
	}
	
	try {
		const res = await fetch(`${PUBLIC_API_URL}/api/auth/get-session`, {
			headers: { Cookie: `better-auth.session_token=${sessionToken}` }
		});
		const data = await res.json();
		
		// Not logged in
		if (!data.user) {
			redirect(302, '/login');
		}
		
		// Already has profile
		if (data.hasProfile === true) {
			redirect(302, '/');
		}
		
		return {
			user: data.user
		};
	} catch {
		redirect(302, '/login');
	}
};