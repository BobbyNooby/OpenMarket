import { db } from './db';
import { sql } from 'drizzle-orm';
import {
	user,
	userProfilesTable,
	usersActivityTable,
	itemsTable,
	currenciesTable,
	profileReviewsTable,
	listingsTable,
	listingOfferedItemsTable,
	listingOfferedCurrenciesTable
} from './schemas';

// ============== SEED DATA ==============

// Users data (30 users)
const users = [
	{
		username: 'crimsonblade',
		display_name: 'Alex',
		description: 'Trading veteran with 5+ years experience'
	},
	{
		username: 'shadowhunter',
		display_name: 'Jordan',
		description: 'Casual player looking for fair trades'
	},
	{ username: 'mysticmage', display_name: 'Taylor', description: 'Collector seeking rare items' },
	{ username: 'stormrider', display_name: 'Morgan', description: 'Active trader, fast responses' },
	{
		username: 'ironfist',
		display_name: 'Casey',
		description: 'New to trading, learning the ropes'
	},
	{
		username: 'silverarrow',
		display_name: 'Riley',
		description: 'Bulk seller, competitive prices'
	},
	{
		username: 'goldenknight',
		display_name: 'Avery',
		description: 'Reliable trader with good reputation'
	},
	{
		username: 'darkphoenix',
		display_name: 'Quinn',
		description: 'Looking for specific items, check my wishlist'
	},
	{
		username: 'frostwolf',
		display_name: 'Sage',
		description: 'Weekend warrior, trades on Saturdays'
	},
	{
		username: 'thunderstrike',
		display_name: 'River',
		description: 'Professional merchant, serious inquiries only'
	},
	{ username: 'dragonslayer', display_name: 'Phoenix', description: 'Hunting for legendary gear' },
	{
		username: 'moonwalker',
		display_name: 'Dakota',
		description: 'Night owl trader, usually online late'
	},
	{
		username: 'stargazer',
		display_name: 'Skylar',
		description: 'Astronomer by day, trader by night'
	},
	{
		username: 'flamekeeper',
		display_name: 'Ash',
		description: 'Fire magic specialist, seeking fire items'
	},
	{ username: 'oceandrifter', display_name: 'Blake', description: 'Sailor and treasure hunter' },
	// Additional 15 users (doubling the count)
	{
		username: 'voidwalker',
		display_name: 'Ember',
		description: 'Void magic enthusiast, trading dark items'
	},
	{
		username: 'crystalseer',
		display_name: 'Luna',
		description: 'Divination expert seeking crystals and orbs'
	},
	{
		username: 'ironforge',
		display_name: 'Finn',
		description: 'Blacksmith trading crafted equipment'
	},
	{ username: 'windwhisper', display_name: 'Zara', description: 'Swift trades, wind magic user' },
	{
		username: 'shadowveil',
		display_name: 'Raven',
		description: 'Stealth specialist, rare item hunter'
	},
	{
		username: 'sunbringer',
		display_name: 'Sol',
		description: 'Light magic trader, fair deals always'
	},
	{
		username: 'frostbite',
		display_name: 'Winter',
		description: 'Ice magic collector from the northern seas'
	},
	{
		username: 'earthshaker',
		display_name: 'Stone',
		description: 'Heavy armor and earth magic specialist'
	},
	{
		username: 'stormcaller',
		display_name: 'Thunder',
		description: 'Lightning mage, electric personality'
	},
	{
		username: 'bloodmoon',
		display_name: 'Crimson',
		description: 'Night trader, best prices after dark'
	},
	{
		username: 'spiritbinder',
		display_name: 'Ghost',
		description: 'Soul magic expert, ethereal items only'
	},
	{
		username: 'runemaster',
		display_name: 'Sigil',
		description: 'Ancient runes and enchantments dealer'
	},
	{
		username: 'tidecaller',
		display_name: 'Coral',
		description: 'Ocean explorer, sunken treasures for trade'
	},
	{
		username: 'blazeheart',
		display_name: 'Pyra',
		description: 'Fire enthusiast, always burning deals'
	},
	{
		username: 'nightshade',
		display_name: 'Dusk',
		description: 'Poison specialist, handle with care'
	}
];

// Items from sampleItems (Arcane Odyssey themed)
const items = [
	{
		name: 'The Lost Crown of Ravenna [Calvus]',
		slug: 'lost-crown-of-ravenna-calvus',
		description:
			'A crown made out of sun-forged bronze, a technique invented by the Samerians. It was specifically made for King Calvus IV, the Third King of Ravenna, and was stolen from him after he was killed in Ravenna Castello, at the heart of the Ravenna Realm in the Bronze Sea.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://raw.githubusercontent.com/BobbyNooby/AOGearBuilder/typescript/static/assets/images/Armor/Calvus/calvusCrown.jpg'
	},
	{
		name: 'Dapper Witch Hat',
		slug: 'dapper-witch-hat',
		description:
			'A dapper hat for dapper people. It can be enchanted by an Alchemist in order to increase its stats.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://static.wikia.nocookie.net/roblox-arcane-odyssey/images/6/6d/Dapper_witch_hat.png'
	},
	{
		name: 'Caped Golden Pauldrons',
		slug: 'caped-golden-pauldrons',
		description: 'An ornate set of golden pauldrons with a cape.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://github.com/BobbyNooby/AOGearBuilder/blob/typescript/static/assets/images/Armor/lowlevel/capedGoldenPauldrons.jpg?raw=true'
	},
	{
		name: 'Thermo Fist Belt',
		slug: 'thermo-fist-belt',
		description:
			"A thick belt made for thermo fist users, designed to compliment the style's strengths.",
		wiki_link: 'https://bobbynooby.dev',
		image_url: ''
	},
	{
		name: 'Iron Leg Armor',
		slug: 'iron-leg-armor',
		description:
			"A set of lightweight armor made for iron leg users, designed to compliment the style's strengths.",
		wiki_link: 'https://bobbynooby.dev',
		image_url: ''
	},
	{
		name: 'Ice Arcanium Mage Coat',
		slug: 'ice-arcanium-mage-coat',
		description:
			'An arcanium-fabric coat made to conduct ice magic, usually worn by mages to amplify certain aspects of their magic.',
		wiki_link: 'https://bobbynooby.dev',
		image_url: ''
	},
	{
		name: 'Ice Arcmancer Robes',
		slug: 'ice-arcmancer-robes',
		description:
			'A set of arcanium-fabric robes made to conduct ice magic, usually worn by mages to amplify certain aspects of their magic.',
		wiki_link: 'https://bobbynooby.dev',
		image_url: ''
	},
	{
		name: 'Sunken Iron Boots',
		slug: 'sunken-iron-boots',
		description:
			'A set of boots made out of arcanium metal that have spent hundreds of years underwater, causing their properties to change. They seem to constantly produce water.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://raw.githubusercontent.com/BobbyNooby/AOGearBuilder/typescript/static/assets/images/Armor/Sunken%20Iron/sunkenBoots.jpg'
	},
	{
		name: 'Lost Envoy Pants',
		slug: 'lost-envoy-pants',
		description: 'Mystical pants worn by the Lost Envoys of the ancient realm.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://static.wikia.nocookie.net/roblox-arcane-odyssey/images/a/ae/Lost_Envoy_Pants.png'
	},
	{
		name: 'Enhanced',
		slug: 'enhanced',
		description: 'Adds intensity points for every 10 levels, making your abilities more potent.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://github.com/BobbyNooby/AOGearBuilder/blob/typescript/static/assets/images/Enchants/Exotic/enchantEnhanced.jpg?raw=true'
	},
	{
		name: 'Brisk',
		slug: 'brisk',
		description: 'Increases attack speed for every 10 levels, allowing you to strike faster.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://github.com/BobbyNooby/AOGearBuilder/blob/typescript/static/assets/images/Enchants/Exotic/enchantBrisk.jpg?raw=true'
	},
	{
		name: 'Abyssal',
		slug: 'abyssal',
		description: 'Adds low defense and medium resistance for each 10 levels.',
		wiki_link: 'https://bobbynooby.dev',
		image_url: ''
	},
	{
		name: 'Archaic',
		slug: 'archaic',
		description: 'Increases attack size for each 10 levels, expanding your area of effect.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://raw.githubusercontent.com/BobbyNooby/AOGearBuilder/typescript/static/assets/images/Modifiers/modifierArchaic.jpg'
	},
	{
		name: 'Agility Gem',
		slug: 'agility-gem',
		description: 'A rare gem that maximizes agility, granting swift movement and quick reflexes.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://github.com/BobbyNooby/AOGearBuilder/blob/typescript/static/assets/images/Gems/gemAgilityMaxPlaceholder.jpg?raw=true'
	},
	{
		name: 'Intensity Gem',
		slug: 'intensity-gem',
		description:
			'A rare gem that maximizes intensity, amplifying the power of your magical abilities.',
		wiki_link: 'https://bobbynooby.dev',
		image_url:
			'https://github.com/BobbyNooby/AOGearBuilder/blob/typescript/static/assets/images/Gems/gemIntensityMaxPlaceholder.jpg?raw=true'
	}
];

// Currencies from sampleItems
const currencies = [
	{
		name: 'Graniumite',
		slug: 'graniumite',
		description:
			'A luminescent crystal currency mined from deep underground caverns. Highly valued by merchants and craftsmen for its unique properties that enhance magical equipment.',
		wiki_link: 'https://bobbynooby.dev',
		image_url: ''
	},
	{
		name: 'Silverstone',
		slug: 'silverstone',
		description:
			'Ancient coins forged from a rare silvery-blue metal found only in the highest mountain peaks. Used as the primary currency among traders in the Bronze Sea.',
		wiki_link: 'https://bobbynooby.dev',
		image_url: ''
	}
];

// Review comments
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
	'Delivered exactly what was promised.',
	'Best trader I have worked with!',
	'Very patient and helpful.',
	'Smooth transaction from start to finish.',
	'Would definitely trade with again.',
	'Professional and courteous.'
];

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function randomDate(daysAgo: number = 365): Date {
	const date = new Date();
	date.setDate(date.getDate() - randomInt(0, daysAgo));
	return date;
}

// Generate placeholder avatar URL using DiceBear API
function getAvatarUrl(seed: string): string {
	// Using different DiceBear styles for variety
	const styles = ['avataaars', 'bottts', 'personas', 'pixel-art', 'adventurer'];
	const style = styles[Math.abs(hashCode(seed)) % styles.length];
	return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return hash;
}

// Generate a random ID similar to better-auth format
function generateId(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 24; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// ============== SEED FUNCTION ==============

// Parse command line arguments
const args = process.argv.slice(2);
const userCountArg = args.find(arg => arg.startsWith('--users='));
const listingsPerUserArg = args.find(arg => arg.startsWith('--listings-per-user='));
const USER_COUNT = userCountArg ? parseInt(userCountArg.split('=')[1], 10) : users.length;
const LISTINGS_PER_USER = listingsPerUserArg ? parseInt(listingsPerUserArg.split('=')[1], 10) : 3;

async function seed() {
	console.log('🌱 Starting database seed...');
	console.log(`   User count: ${USER_COUNT} (use --users=N to customize)`);
	console.log(`   Listings per user: ${LISTINGS_PER_USER} (use --listings-per-user=N to customize)`);

	// Drop and recreate all tables for a fresh start
	console.log('🗑️  Dropping existing tables...');
	await db.execute(sql`
		DROP TABLE IF EXISTS
			listing_offered_currencies,
			listing_offered_items,
			listings,
			profile_reviews,
			users_activity,
			user_profiles,
			currencies,
			items,
			session,
			account,
			verification,
			"user"
		CASCADE
	`);

	// Recreate tables
	console.log('📦 Creating tables...');
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "user" (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			email_verified BOOLEAN NOT NULL DEFAULT false,
			image TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS session (
			id TEXT PRIMARY KEY,
			expires_at TIMESTAMP NOT NULL,
			token TEXT NOT NULL UNIQUE,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			ip_address TEXT,
			user_agent TEXT,
			user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS account (
			id TEXT PRIMARY KEY,
			account_id TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
			access_token TEXT,
			refresh_token TEXT,
			id_token TEXT,
			access_token_expires_at TIMESTAMP,
			refresh_token_expires_at TIMESTAMP,
			scope TEXT,
			password TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS verification (
			id TEXT PRIMARY KEY,
			identifier TEXT NOT NULL,
			value TEXT NOT NULL,
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS user_profiles (
			user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
			username TEXT NOT NULL UNIQUE,
			description TEXT
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS users_activity (
			user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
			is_active BOOLEAN NOT NULL DEFAULT false,
			last_activity_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS items (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			slug TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			description TEXT,
			wiki_link TEXT,
			image_url TEXT
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS currencies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			slug TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			description TEXT,
			wiki_link TEXT,
			image_url TEXT
		)
	`);

	await db.execute(sql`
		DO $$ BEGIN
			CREATE TYPE review_type AS ENUM ('upvote', 'downvote');
		EXCEPTION
			WHEN duplicate_object THEN null;
		END $$
	`);

	await db.execute(sql`
		DO $$ BEGIN
			CREATE TYPE order_type AS ENUM ('buy', 'sell');
		EXCEPTION
			WHEN duplicate_object THEN null;
		END $$
	`);

	await db.execute(sql`
		DO $$ BEGIN
			CREATE TYPE paying_type AS ENUM ('each', 'total');
		EXCEPTION
			WHEN duplicate_object THEN null;
		END $$
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS profile_reviews (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			profile_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
			voter_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
			type review_type NOT NULL,
			comment TEXT
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS listings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			author_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
			requested_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
			requested_currency_id UUID REFERENCES currencies(id) ON DELETE CASCADE,
			amount INTEGER NOT NULL DEFAULT 1,
			order_type order_type NOT NULL,
			paying_type paying_type NOT NULL DEFAULT 'each',
			is_active BOOLEAN NOT NULL DEFAULT true
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS listing_offered_items (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
			item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
			amount INTEGER NOT NULL DEFAULT 1
		)
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS listing_offered_currencies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
			currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
			amount INTEGER NOT NULL DEFAULT 1
		)
	`);

	console.log('   ✅ Tables created');

	// Insert users (both auth user and profile)
	console.log('👥 Inserting users...');
	const insertedUsers: { id: string; username: string }[] = [];

	// Use predefined users up to the limit, generate random users for the rest
	const usersToInsert = USER_COUNT <= users.length
		? users.slice(0, USER_COUNT)
		: [
			...users,
			...Array.from({ length: USER_COUNT - users.length }, (_, i) => ({
				username: `trader${users.length + i + 1}`,
				display_name: `Trader ${users.length + i + 1}`,
				description: `Auto-generated trader #${users.length + i + 1}`
			}))
		];

	for (const userData of usersToInsert) {
		const userId = generateId();
		const now = new Date();

		// Insert into better-auth user table
		await db.insert(user).values({
			id: userId,
			name: userData.display_name,
			email: `${userData.username}@openmarket.test`,
			emailVerified: false,
			image: getAvatarUrl(userData.username),
			createdAt: now,
			updatedAt: now
		});

		// Insert into user_profiles table
		await db.insert(userProfilesTable).values({
			userId: userId,
			username: userData.username,
			description: userData.description
		});

		insertedUsers.push({ id: userId, username: userData.username });
	}
	console.log(`   ✅ Inserted ${insertedUsers.length} users with profiles`);

	// Insert user activity
	console.log('📊 Inserting user activity...');
	const activityData = insertedUsers.map((u, index) => ({
		user_id: u.id,
		is_active: index < 8, // First 8 users are active
		last_activity_at: randomDate(7)
	}));
	await db.insert(usersActivityTable).values(activityData);
	console.log(`   ✅ Inserted activity for ${activityData.length} users`);

	// Insert items
	console.log('🎒 Inserting items...');
	const insertedItems = await db.insert(itemsTable).values(items).returning();
	console.log(`   ✅ Inserted ${insertedItems.length} items with images`);

	// Insert currencies
	console.log('💰 Inserting currencies...');
	const insertedCurrencies = await db.insert(currenciesTable).values(currencies).returning();
	console.log(`   ✅ Inserted ${insertedCurrencies.length} currencies with images`);

	// Insert profile reviews
	console.log('⭐ Inserting profile reviews...');
	const reviews: {
		profile_user_id: string;
		voter_user_id: string;
		type: 'upvote' | 'downvote';
		comment: string | null;
	}[] = [];

	for (let i = 0; i < insertedUsers.length; i++) {
		const numReviews = randomInt(3, 10);
		const otherUsers = insertedUsers.filter((_, idx) => idx !== i);
		const shuffledVoters = [...otherUsers].sort(() => Math.random() - 0.5);

		for (let j = 0; j < numReviews && j < shuffledVoters.length; j++) {
			reviews.push({
				profile_user_id: insertedUsers[i].id,
				voter_user_id: shuffledVoters[j].id,
				type: Math.random() > 0.12 ? 'upvote' : 'downvote', // 88% upvotes
				comment: Math.random() > 0.15 ? randomChoice(reviewComments) : null // 85% have comments
			});
		}
	}
	await db.insert(profileReviewsTable).values(reviews);
	console.log(`   ✅ Inserted ${reviews.length} reviews`);

	// Insert listings
	console.log('📜 Inserting listings...');
	const listings: {
		author_id: string;
		requested_item_id?: string;
		requested_currency_id?: string;
		amount: number;
		order_type: 'buy' | 'sell';
		paying_type: 'each' | 'total';
		is_active: boolean;
	}[] = [];

	// Create listings for each user
	for (const author of insertedUsers) {
		const numListings = randomInt(Math.max(1, LISTINGS_PER_USER - 1), LISTINGS_PER_USER + 1);

		for (let i = 0; i < numListings; i++) {
			// 20% request currencies, 80% request items
			const requestsCurrency = Math.random() < 0.2;

			if (requestsCurrency) {
				const requestedCurrency = randomChoice(insertedCurrencies);
				listings.push({
					author_id: author.id,
					requested_currency_id: requestedCurrency.id,
					amount: randomInt(1000, 100000),
					order_type: Math.random() > 0.5 ? 'buy' : 'sell',
					paying_type: Math.random() > 0.7 ? 'total' : 'each',
					is_active: Math.random() > 0.1 // 90% active
				});
			} else {
				const requestedItem = randomChoice(insertedItems);
				listings.push({
					author_id: author.id,
					requested_item_id: requestedItem.id,
					amount: randomInt(1, 10),
					order_type: Math.random() > 0.5 ? 'buy' : 'sell',
					paying_type: Math.random() > 0.7 ? 'total' : 'each',
					is_active: Math.random() > 0.1 // 90% active
				});
			}
		}
	}
	const insertedListings = await db.insert(listingsTable).values(listings).returning();
	console.log(`   ✅ Inserted ${insertedListings.length} listings (${listings.filter(l => l.requested_currency_id).length} requesting currencies)`);

	// Insert offered items/currencies for listings
	console.log('🔄 Inserting listing offers...');
	let offeredItemsCount = 0;
	let offeredCurrenciesCount = 0;

	for (let idx = 0; idx < insertedListings.length; idx++) {
		const listing = insertedListings[idx];
		const originalListing = listings[idx];

		// 85% chance to offer currencies (but not for listings that request currencies)
		if (Math.random() > 0.15 && !originalListing.requested_currency_id) {
			const numCurrencies = randomInt(1, Math.min(3, insertedCurrencies.length));
			const shuffledCurrencies = [...insertedCurrencies].sort(() => Math.random() - 0.5);

			for (let i = 0; i < numCurrencies; i++) {
				await db.insert(listingOfferedCurrenciesTable).values({
					listing_id: listing.id,
					currency_id: shuffledCurrencies[i].id,
					amount: randomInt(100, 50000)
				});
				offeredCurrenciesCount++;
			}
		}

		// For listings that request currencies, offer items instead
		if (originalListing.requested_currency_id) {
			const numItems = randomInt(1, 4);
			const shuffledItems = [...insertedItems].sort(() => Math.random() - 0.5);

			for (let i = 0; i < numItems && i < shuffledItems.length; i++) {
				await db.insert(listingOfferedItemsTable).values({
					listing_id: listing.id,
					item_id: shuffledItems[i].id,
					amount: randomInt(1, 5)
				});
				offeredItemsCount++;
			}
		}
		// 40% chance to also offer items (barter) for regular listings
		else if (Math.random() > 0.6) {
			const numItems = randomInt(1, 4);
			const shuffledItems = [...insertedItems].sort(() => Math.random() - 0.5);

			for (let i = 0; i < numItems && i < shuffledItems.length; i++) {
				if (shuffledItems[i].id !== originalListing.requested_item_id) {
					await db.insert(listingOfferedItemsTable).values({
						listing_id: listing.id,
						item_id: shuffledItems[i].id,
						amount: randomInt(1, 5)
					});
					offeredItemsCount++;
				}
			}
		}
	}
	console.log(`   ✅ Inserted ${offeredCurrenciesCount} offered currencies`);
	console.log(`   ✅ Inserted ${offeredItemsCount} offered items`);

	console.log('\n✅ Database seed completed successfully!\n');

	console.log('📋 Summary:');
	console.log('─'.repeat(40));
	console.log(`   👥 Users:              ${insertedUsers.length}`);
	console.log(`   🎒 Items:              ${insertedItems.length}`);
	console.log(`   💰 Currencies:         ${insertedCurrencies.length}`);
	console.log(`   ⭐ Reviews:            ${reviews.length}`);
	console.log(`   📜 Listings:           ${insertedListings.length}`);
	console.log(`   💎 Offered currencies: ${offeredCurrenciesCount}`);
	console.log(`   🎁 Offered items:      ${offeredItemsCount}`);
	console.log('─'.repeat(40));

	process.exit(0);
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
