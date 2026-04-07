import type { PageServerLoad, Actions } from './$types';
import { api } from '$lib/api/server';
import { fail } from '@sveltejs/kit';

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

	// Fetch user's listings + have/want lists in parallel
	const [listingsResult, listsResult] = await Promise.all([
		api.listings.user({ userId: profile.id }).get(),
		api.lists.user({ userId: profile.id }).get(),
	]);
	const listings = listingsResult.data?.success ? listingsResult.data.data : [];
	const lists = listsResult.data?.success ? listsResult.data.data : { have: [], want: [] };

	return {
		username,
		profile,
		listings,
		lists,
		session
	};
};

export const actions: Actions = {
	submitReview: async ({ request, params }) => {
		const formData = await request.formData();
		const type = formData.get('type') as 'upvote' | 'downvote';
		const comment = formData.get('comment') as string | null;
		const { username } = params;

		if (!username) {
			return fail(400, { error: 'Username not provided' });
		}

		const result = await api.users.profile({ username }).reviews.post({
			type,
			comment: comment || undefined
		}, { headers: { cookie: request.headers.get('cookie') || '' } });

		if (!result.data?.success) {
			return fail(400, { error: result.data?.error || 'Failed to submit review' });
		}

		return { success: true };
	}
};
