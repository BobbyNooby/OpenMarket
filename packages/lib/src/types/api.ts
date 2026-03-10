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

// Public user type (without sensitive fields like discord_id)
export interface PublicUser {
  id: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  description?: string;
}

export interface UserWithActivity extends User {
  is_active: boolean;
  last_activity_at?: string;
}

// Base item type (minimal fields for mock data)
export interface ItemBase {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  wiki_link?: string;
  image_url?: string;
}

// Full item with slug (from database)
export interface Item extends ItemBase {
  slug: string;
}

// Base currency type (minimal fields for mock data)
export interface CurrencyBase {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  wiki_link?: string;
  image_url?: string;
}

// Full currency with slug (from database)
export interface Currency extends CurrencyBase {
  slug: string;
}

// === Review Types ===
// Base review without joined voter data
export interface ProfileReviewBase {
  id: string;
  created_at: string;
  type: "upvote" | "downvote";
  profile_user_id: string;
  voter_id: string;
  comment?: string;
}

// Full review with joined voter data (from API responses)
export interface ProfileReview extends ProfileReviewBase {
  voter: PublicUser;
}

// === Listing Types ===
// Base offered item (for mock data without slug)
export interface OfferedItemBase {
  item: ItemBase;
  amount: number;
}

// Full offered item with slug
export interface OfferedItem {
  item: Item;
  amount: number;
}

// Base offered currency (for mock data without slug)
export interface OfferedCurrencyBase {
  currency: CurrencyBase;
  amount: number;
}

// Full offered currency with slug
export interface OfferedCurrency {
  currency: Currency;
  amount: number;
}

// Base listing without joined relations (for mock data/creation)
export interface ListingBase {
  id: string;
  created_at: string;
  author_id: string;
  requested_item_id?: string;
  requested_currency_id?: string;
  amount: number;
  order_type: "buy" | "sell";
  paying_type: "each" | "total";
  status?: 'active' | 'paused' | 'expired';
  expires_at?: string | null;
  offered_items?: OfferedItemBase[];
  offered_currencies?: OfferedCurrencyBase[];
}

// Full listing with joined relations (from API responses)
export interface Listing {
  id: string;
  created_at: string;
  author_id: string;
  requested_item_id?: string;
  requested_currency_id?: string;
  amount: number;
  order_type: "buy" | "sell";
  paying_type: "each" | "total";
  status: 'active' | 'paused' | 'expired';
  expires_at: string | null;
  author: User;
  requested_item?: Item;
  requested_currency?: Currency;
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
  type: "item" | "currency" | "";
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
  type: "item" | "currency";
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

// === Utility types for components ===
export type ListingAuthor = Listing["author"];
export type ListingRequestedItem = Listing["requested_item"];
export type ListingRequestedCurrency = Listing["requested_currency"];
export type ReviewVoter = ProfileReview["voter"];
