export type MarketOrder = {
	id: string;
};

export type User = {
	id: string;
	name: string;
	email: string;
	created_at: string;
	is_active: boolean;
	last_activity_at?: string;
	avatar_url?: string;
	order_history?: MarketOrder[];
};

export type Currency = GenericItem;

export type Item = GenericItem;

export type GenericItem = {
	id: string;
	name: string;
	description?: string;
	wiki_link?: string;
	image_url?: string;
};
