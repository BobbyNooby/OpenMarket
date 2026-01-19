// Re-export all types from shared lib for backwards compatibility
// New code should import from '$lib/api/types' or '@openmarket/lib/types' directly
export type {
	// Base entity types
	User,
	UserWithActivity,
	ItemBase,
	Item,
	CurrencyBase,
	Currency,
	// Review types
	ProfileReviewBase,
	ProfileReview,
	// Listing types
	OfferedItemBase,
	OfferedItem,
	OfferedCurrencyBase,
	OfferedCurrency,
	ListingBase,
	Listing,
	// Profile
	Profile,
	// Form types
	ItemFormData,
	GenericItem,
	// API response types
	ApiSuccess,
	ApiError,
	ApiResponse
} from '@openmarket/lib/types';

// Legacy alias - MarketOrder is now called ListingBase in the shared lib (for mock data)
export type { ListingBase as MarketOrder } from '@openmarket/lib/types';

// Legacy alias - UserPageProfile is now called Profile in the shared lib
export type { Profile as UserPageProfile } from '@openmarket/lib/types';

// Legacy alias - UserActivity is now part of UserWithActivity
export type { UserWithActivity as UserActivity } from '@openmarket/lib/types';
