import { db } from './db';
import {
	usersTable,
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

// ============== SEED FUNCTION ==============

async function seed() {
	console.log('🌱 Starting database seed...');

	// Clear existing data (in reverse order of dependencies)
	console.log('🗑️  Clearing existing data...');
	await db.delete(listingOfferedCurrenciesTable);
	await db.delete(listingOfferedItemsTable);
	await db.delete(listingsTable);
	await db.delete(profileReviewsTable);
	await db.delete(usersActivityTable);
	await db.delete(currenciesTable);
	await db.delete(itemsTable);
	await db.delete(usersTable);

	// Insert users with DiceBear avatars
	console.log('👥 Inserting users...');
	const usersToInsert = users.map((user, i) => ({
		discord_id: `${100000000000000000n + BigInt(i) * 1000000000000000n}`,
		username: user.username,
		display_name: user.display_name,
		avatar_url: getAvatarUrl(user.username),
		description: user.description
	}));
	const insertedUsers = await db.insert(usersTable).values(usersToInsert).returning();
	console.log(`   ✅ Inserted ${insertedUsers.length} users with avatars`);

	// Insert user activity
	console.log('📊 Inserting user activity...');
	const activityData = insertedUsers.map((user, index) => ({
		user_id: user.id,
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

	// Create 30 listings for variety - 25 requesting items, 5 requesting currencies
	for (let i = 0; i < 30; i++) {
		const author = randomChoice(insertedUsers);

		// 80% request items, 20% request currencies
		const requestsCurrency = i >= 24; // Last 6 listings request currencies

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
