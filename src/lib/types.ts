export type MarketOrder = DefaultIdentifier & {
	author_id: string;
	requested_item_id: string;
	amount: number;
	offered_items?: { item: Item; amount: number }[];
	offered_currencies?: { currency: Currency; amount: number }[];
	paying_type: 'each' | 'total';
	order_type: 'buy' | 'sell';
};

// User Table
export type User = DefaultIdentifier & {
	discord_id: string;
	username: string;
	display_name: string;
	created_at: string;
	avatar_url?: string;
	description?: string;
};

// Activity Table
export type UserActivity = {
	discord_id: string;
	is_active: boolean;
	last_activity_at: string;
};

//Query result of User Table JOINED with UserActivity and Votes and Comments
export type UserPageProfile = User & UserActivity;

// & {
// 	votes: ProfileVote[];
// 	comments: ProfileComment[];
// };

// Vote Table
export type ProfileVote = DefaultIdentifier & {
	type: 'upvote' | 'downvote';
	voter: User;
};

export type ProfileComment = DefaultIdentifier & {
	content: string;
};

export type Currency = GenericItem;

export type Item = GenericItem;

export type GenericItem = DefaultIdentifier & {
	name: string;
	description?: string;
	wiki_link?: string;
	image_url?: string;
};

export type DefaultIdentifier = {
	id: string;
	created_at: string;
};
