import { getUserProfileFromUsername } from '$lib/api/getUserProfileFromUsername.js';

export const load = async ({ params }) => {
	const { username } = params;

	if (!username) return { status: 404, error: 'User not found' };

	const response = await getUserProfileFromUsername(username);

	const { status, data } = response;
	if (status !== 200)
		return { status, profile: undefined, error: `No profile for user "${username}" found` };

	return { status, profile: data };
};
