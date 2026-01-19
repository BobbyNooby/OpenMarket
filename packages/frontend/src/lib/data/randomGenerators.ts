import type { User, ProfileReviewBase, ListingBase, OfferedItemBase, OfferedCurrencyBase } from '$lib/types';
import { sampleItems } from './sampleItems';

const usernames = [
	'CrimsonBlade',
	'ShadowHunter',
	'MysticMage',
	'StormRider',
	'IronFist',
	'SilverArrow',
	'GoldenKnight',
	'DarkPhoenix',
	'FrostWolf',
	'ThunderStrike',
	'DragonSlayer',
	'MoonWalker',
	'StarGazer',
	'FlameKeeper',
	'OceanDrifter',
	'SkyPirate',
	'EarthShaker',
	'WindRunner',
	'NightCrawler',
	'SunSeeker'
];

const displayNames = [
	'Alex',
	'Jordan',
	'Taylor',
	'Morgan',
	'Casey',
	'Riley',
	'Avery',
	'Quinn',
	'Sage',
	'River',
	'Phoenix',
	'Dakota',
	'Skylar',
	'Ash',
	'Blake',
	'Cameron',
	'Drew',
	'Ember',
	'Finley',
	'Harper'
];

const userDescriptions = [
	'Trading veteran with 5+ years experience',
	'Casual player looking for fair trades',
	'Collector seeking rare items',
	'Active trader, fast responses',
	'New to trading, learning the ropes',
	'Bulk seller, competitive prices',
	'Reliable trader with good reputation',
	'Looking for specific items, check my wishlist',
	'Weekend warrior, trades on Saturdays',
	'Professional merchant, serious inquiries only'
];

const reviewComments = [
	'Great trader! Fast and fair deal.',
	'Very trustworthy, would trade again.',
	'Quick response time, smooth transaction.',
	'Fair prices and professional service.',
	'Highly recommend this trader!',
	'A bit slow to respond but fair deal.',
	'Good communication throughout the trade.',
	'Exactly as described, no issues.',
	'Pleasant trading experience.',
	'Could be more flexible on prices.',
	'Amazing trader, went above and beyond!',
	'Reliable and honest, 10/10',
	'Fast trade, no problems at all.',
	'Fair negotiation, good person to work with.',
	'Delivered exactly what was promised.'
];

// Helper functions
function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function randomId(): string {
	return Math.random().toString(36).substring(2, 15);
}

function randomDate(daysAgo: number = 365): string {
	const date = new Date();
	date.setDate(date.getDate() - randomInt(0, daysAgo));
	return date.toISOString();
}

// Generate random user
export function generateRandomUser(): User {
	const username = randomChoice(usernames);
	const displayName = randomChoice(displayNames);

	return {
		id: randomId(),
		discord_id: randomInt(100000000000000000, 999999999999999999).toString(),
		username,
		display_name: displayName,
		created_at: randomDate(730), // Up to 2 years ago
		avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
		description: Math.random() > 0.3 ? randomChoice(userDescriptions) : undefined
	};
}

// Generate pool of users
export function generateUserPool(count: number = 20): User[] {
	const users: User[] = [];
	for (let i = 0; i < count; i++) {
		users.push(generateRandomUser());
	}
	return users;
}

// Generate random profile review (base type without voter object)
export function generateRandomReview(profileUserId: string, voterPool: User[]): ProfileReviewBase {
	const voter = randomChoice(voterPool);
	const hasComment = Math.random() > 0.2; // 80% chance of having a comment

	return {
		id: randomId(),
		created_at: randomDate(180), // Up to 6 months ago
		type: Math.random() > 0.15 ? 'upvote' : 'downvote', // 85% upvotes
		profile_user_id: profileUserId,
		voter_id: voter.id,
		comment: hasComment ? randomChoice(reviewComments) : undefined
	};
}

// Generate multiple reviews for a user
export function generateReviewsForUser(
	profileUserId: string,
	voterPool: User[],
	count?: number
): ProfileReviewBase[] {
	const reviewCount = count ?? randomInt(0, 15);
	const reviews: ProfileReviewBase[] = [];

	for (let i = 0; i < reviewCount; i++) {
		reviews.push(generateRandomReview(profileUserId, voterPool));
	}

	return reviews;
}

// Generate random listing (base type without joined relations)
export function generateRandomListing(author: User): ListingBase {
	const orderType: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
	const payingType: 'each' | 'total' = Math.random() > 0.5 ? 'each' : 'total';

	// Pick a random item to request
	const requestedItem = randomChoice(sampleItems);

	// Decide if offering items or currencies
	const offerType = Math.random();

	let offeredItems: OfferedItemBase[] | undefined;
	let offeredCurrencies: OfferedCurrencyBase[] | undefined;

	if (offerType > 0.5) {
		// Offer items
		const itemCount = randomInt(1, 3);
		offeredItems = [];
		for (let i = 0; i < itemCount; i++) {
			const item = randomChoice(sampleItems.filter((i) => i.type === 'item'));
			offeredItems.push({
				item: {
					id: item.id || randomId(),
					name: item.name,
					image_url: item.image_url || '',
					created_at: item.created_at || randomDate()
				},
				amount: randomInt(1, 10)
			});
		}
	} else {
		// Offer currencies
		const currencyCount = randomInt(1, 2);
		offeredCurrencies = [];
		for (let i = 0; i < currencyCount; i++) {
			const currency = randomChoice(sampleItems.filter((i) => i.type === 'currency'));
			offeredCurrencies.push({
				currency: {
					id: currency.id || randomId(),
					name: currency.name,
					image_url: currency.image_url || '',
					created_at: currency.created_at || randomDate()
				},
				amount: randomInt(100, 10000)
			});
		}
	}

	return {
		id: randomId(),
		created_at: randomDate(30), // Up to 1 month ago
		author_id: author.id,
		requested_item_id: requestedItem.id || randomId(),
		amount: randomInt(1, 20),
		offered_items: offeredItems,
		offered_currencies: offeredCurrencies,
		paying_type: payingType,
		order_type: orderType
	};
}

// Generate multiple listings
export function generateRandomListings(users: User[], count: number = 50): ListingBase[] {
	const listings: ListingBase[] = [];

	for (let i = 0; i < count; i++) {
		const author = randomChoice(users);
		listings.push(generateRandomListing(author));
	}

	return listings;
}

// Legacy alias
export const generateRandomOrder = generateRandomListing;
export const generateRandomOrders = generateRandomListings;

// Generator for complete test data
export function generateTestData() {
	const users = generateUserPool(20);

	// Generate reviews for some users
	const usersWithReviews = users.slice(0, 10).map((user) => ({
		...user,
		reviews: generateReviewsForUser(user.id, users)
	}));

	const listings = generateRandomListings(users, 50);

	return {
		users,
		usersWithReviews,
		listings,
		// Legacy alias
		orders: listings
	};
}
