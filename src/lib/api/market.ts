const root_url = 'http://localhost:3000';

async function get(route: string, params?: RequestInit) {
	return await fetch(`${root_url}${route}`, {
		...params,
		method: 'GET'
	});
}

async function post(route: string, params: RequestInit) {
	return await fetch(`${root_url}${route}`, {
		...params,
		method: 'POST'
	});
}

export const MarketAPI = {
	ping: async () => {
		return await get('/api/ping');
	},

	userUpdate: async ({
		id,
		username,
		display_name,
		avatar_url
	}: {
		id: string;
		username: string;
		display_name: string;
		avatar_url: string;
	}) => {
		return await post('/api/userUpdate', {
			body: JSON.stringify({
				id,
				username,
				display_name,
				avatar_url
			})
		});
	}
};
