import { redirect } from '@sveltejs/kit';

export const load = async ({ parent }) => {
	const { session } = await parent();
	if (!session?.user) redirect(302, '/');
	return { session };
};
