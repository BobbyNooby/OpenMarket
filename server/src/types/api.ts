/**
 * Shared API Types
 *
 * These types define the shape of API responses.
 * Import these in both backend routes and frontend components.
 */

// === Base Entity Types (from database) ===
export interface User {
	id: string;
	created_at: string;
	discord_id: string;
	username: string;
	display_name: string;
	avatar_url?: string;
	description?: string;
}

export interface UserWithActivity extends User {
	is_active: boolean;
	last_activity_at?: string;
}

export interface Item {
	id: string;
	created_at: string;
	slug: string;
	name: string;
	description?: string;
	wiki_link?: string;
	image_url?: string;
}

export interface Currency {
	id: string;
	created_at: string;
	slug: string;
	name: string;
	description?: string;
	wiki_link?: string;
	image_url?: string;
}

// === Review Types ===
export interface ProfileReview {
	id: string;
	created_at: string;
	type: 'upvote' | 'downvote';
	profile_user_id: string;
	voter_id: string;
	comment?: string;
	voter: User;
}

// === Listing Types ===
export interface OfferedItem {
	item: Item;
	amount: number;
}

export interface OfferedCurrency {
	currency: Currency;
	amount: number;
}

export interface Listing {
	id: string;
	created_at: string;
	author_id: string;
	requested_item_id: string;
	amount: number;
	order_type: 'buy' | 'sell';
	paying_type: 'each' | 'total';
	is_active: boolean;
	author: User;
	requested_item: Item;
	offered_items: OfferedItem[];
	offered_currencies: OfferedCurrency[];
}

// === Profile Response ===
export interface Profile extends UserWithActivity {
	reviews: ProfileReview[];
}

// === Form Types ===
// Used for create/edit forms that handle both items and currencies
export interface ItemFormData {
	id?: string;
	name: string;
	type: 'item' | 'currency' | '';
	description?: string;
	wiki_link?: string;
	image_url?: string;
	created_at?: string;
}

// Generic item type used in admin panel (combines Item/Currency with type field)
export interface GenericItem {
	id: string;
	created_at: string;
	slug: string;
	name: string;
	type: 'item' | 'currency';
	description?: string;
	wiki_link?: string;
	image_url?: string;
}

// === API Response Wrappers ===
export interface ApiSuccess<T> {
	success: true;
	data: T;
}

export interface ApiError {
	success: false;
	error: string;
	status?: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
