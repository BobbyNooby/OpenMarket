export type {
	// Base entities
	User,
	UserWithActivity,
	Item,
	Currency,
	// Reviews
	ProfileReview,
	// Listings
	OfferedItem,
	OfferedCurrency,
	Listing,
	// Profile
	Profile,
	// Form types
	ItemFormData,
	GenericItem,
	// API responses
	ApiSuccess,
	ApiError,
	ApiResponse
} from '../../../server/src/types/api';

// === Utility types for components ===
import type { Listing, ProfileReview } from '../../../server/src/types/api';

export type ListingAuthor = Listing['author'];
export type ListingRequestedItem = Listing['requested_item'];
export type ListingRequestedCurrency = Listing['requested_currency'];
export type ReviewVoter = ProfileReview['voter'];
