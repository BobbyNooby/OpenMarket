import type { PageServerLoad } from './$types';
import { api } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { session } = await parent();
	const { username } = params;

	if (!username) {
		return { status: 404, error: 'Username not provided' };
	}

	// Fetch user profile from API
	const profileResult = await api.users.profile({ username }).get();

	if (!profileResult.data?.success || !profileResult.data.data) {
		return {
			username,
			profile: null,
			listings: [],
			error: profileResult.data?.error || 'User not found'
		};
	}

	const profile = profileResult.data.data;

	// Fetch user's listings
	const listingsResult = await api.listings.user({ userId: profile.id }).get();
	const listings = listingsResult.data?.success ? listingsResult.data.data : [];

	return {
		username,
		profile,
		listings,
		session
	};
};
