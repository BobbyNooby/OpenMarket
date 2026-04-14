// Activity Simulator — creates realistic marketplace traffic directly via DB
// Usage: bun --env-file=../../.env scripts/simulate.ts [--tick=2000] [--max=100]

import { db } from '../src/db/db';
import { user, userProfilesTable, listingsTable, listingOfferedItemsTable, listingOfferedCurrenciesTable, itemsTable, currenciesTable, profileReviewsTable, watchlistTable } from '../src/db/schemas';
import { eq, sql } from 'drizzle-orm';
import { listingSelectShape, requestedCurrencyTable, fetchOfferedForListings, serializeListing } from '../src/routes/listings/shared';

const API_URL = process.env.PUBLIC_API_URL || 'http://localhost:3000';

const args = process.argv.slice(2);
function getArg(name: string, fallback: number): number {
	const arg = args.find(a => a.startsWith(`--${name}=`));
	return arg ? parseInt(arg.split('=')[1], 10) : fallback;
}
const TICK_MS = getArg('tick', 2000);
const MAX_EVENTS = getArg('max', 200);

function randomChoice<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

const ACTIONS = [
	{ name: 'browse', weight: 10, fn: trackPageView },
	{ name: 'create_listing', weight: 30, fn: createListing },
	{ name: 'review', weight: 10, fn: submitReview },
	{ name: 'watchlist', weight: 10, fn: toggleWatchlist },
	{ name: 'view', weight: 15, fn: trackPageView },
	{ name: 'pause_listing', weight: 5, fn: pauseListing },
];

const totalWeight = ACTIONS.reduce((sum, a) => sum + a.weight, 0);
function pickAction() {
	let r = Math.random() * totalWeight;
	for (const a of ACTIONS) { r -= a.weight; if (r <= 0) return a; }
	return ACTIONS[0];
}

let userList: { id: string; username: string }[] = [];
let itemIds: string[] = [];
let currencyIds: string[] = [];
let listingIds: string[] = [];

async function setup() {
	const users = await db
		.select({ id: user.id, username: userProfilesTable.username })
		.from(user)
		.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
		.where(sql`${user.email} LIKE '%@openmarket.test'`);

	if (users.length === 0) {
		console.error('No seeded users. Run pnpm db:seed first.');
		process.exit(1);
	}
	userList = users;

	const items = await db.select({ id: itemsTable.id }).from(itemsTable);
	const currencies = await db.select({ id: currenciesTable.id }).from(currenciesTable);
	const listings = await db.select({ id: listingsTable.id }).from(listingsTable).limit(50);

	itemIds = items.map(i => i.id);
	currencyIds = currencies.map(c => c.id);
	listingIds = listings.map(l => l.id);

	console.log(`Loaded ${userList.length} users, ${itemIds.length} items, ${currencyIds.length} currencies, ${listingIds.length} listings`);
}

function randomUser() {
	return randomChoice(userList);
}

async function createListing() {
	const u = randomUser();
	const isBuy = Math.random() > 0.5;
	const requestsItem = Math.random() > 0.2;

	const values: any = {
		author_id: u.id,
		amount: Math.floor(Math.random() * 10) + 1,
		order_type: isBuy ? 'buy' : 'sell',
		paying_type: Math.random() > 0.7 ? 'total' : 'each',
		status: 'active',
		expires_at: new Date(Date.now() + 30 * 86400000),
	};

	if (requestsItem && itemIds.length > 0) {
		values.requested_item_id = randomChoice(itemIds);
	} else if (currencyIds.length > 0) {
		values.requested_currency_id = randomChoice(currencyIds);
		values.amount = Math.floor(Math.random() * 50000) + 1000;
	} else {
		return 'no items or currencies';
	}

	const [listing] = await db.insert(listingsTable).values(values).returning();
	listingIds.push(listing.id);

	// Add offered items/currencies
	if (currencyIds.length > 0 && !values.requested_currency_id) {
		await db.insert(listingOfferedCurrenciesTable).values({
			listing_id: listing.id,
			currency_id: randomChoice(currencyIds),
			amount: Math.floor(Math.random() * 10000) + 100,
		});
	}
	if (itemIds.length > 0 && values.requested_currency_id) {
		await db.insert(listingOfferedItemsTable).values({
			listing_id: listing.id,
			item_id: randomChoice(itemIds),
			amount: Math.floor(Math.random() * 5) + 1,
		});
	}

	// Broadcast via the internal endpoint so WebSocket clients see it in real-time
	try {
		const [full] = await db.select(listingSelectShape)
			.from(listingsTable)
			.innerJoin(user, eq(listingsTable.author_id, user.id))
			.leftJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
			.leftJoin(itemsTable, eq(listingsTable.requested_item_id, itemsTable.id))
			.leftJoin(requestedCurrencyTable, eq(listingsTable.requested_currency_id, requestedCurrencyTable.id))
			.where(eq(listingsTable.id, listing.id));
		if (full) {
			const { offeredItemsByListing, offeredCurrenciesByListing } = await fetchOfferedForListings([listing.id]);
			const serialized = serializeListing(full as any, offeredItemsByListing, offeredCurrenciesByListing);
			await fetch(`${API_URL}/internal/broadcast-listing`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(serialized),
			});
		}
	} catch {}

	return `${u.username} created a ${values.order_type} listing`;
}

async function submitReview() {
	const reviewer = randomUser();
	const target = randomChoice(userList.filter(u => u.id !== reviewer.id));
	if (!target) return 'not enough users';

	const comments = ['Great trader!', 'Fast response', 'Good deal', 'Smooth trade', 'Reliable', 'Fair prices', 'Friendly'];
	await db.insert(profileReviewsTable).values({
		profile_user_id: target.id,
		voter_user_id: reviewer.id,
		type: Math.random() > 0.15 ? 'upvote' : 'downvote',
		comment: Math.random() > 0.3 ? randomChoice(comments) : null,
	}).onConflictDoNothing();

	return `${reviewer.username} reviewed ${target.username}`;
}

async function toggleWatchlist() {
	if (listingIds.length === 0) return 'no listings';
	const u = randomUser();
	const id = randomChoice(listingIds);
	await db.insert(watchlistTable).values({
		user_id: u.id,
		listing_id: id,
	}).onConflictDoNothing();
	return `${u.username} watchlisted ${id.slice(0, 8)}`;
}

async function pauseListing() {
	if (listingIds.length === 0) return 'no listings';
	const id = randomChoice(listingIds);
	const status = Math.random() > 0.5 ? 'paused' : 'active';
	await db.update(listingsTable).set({ status }).where(eq(listingsTable.id, id));
	return `set ${id.slice(0, 8)} to ${status}`;
}

async function trackPageView() {
	// Just a no-op log — analytics tracking requires HTTP
	const u = randomUser();
	const pages = ['/', '/listings', '/items', '/dashboard', '/watchlist'];
	return `${u.username} browsed ${randomChoice(pages)}`;
}

async function fireAction() {
	const action = pickAction();
	try {
		const result = await action.fn();
		return { name: action.name, result };
	} catch (err: any) {
		return { name: action.name, result: `ERROR: ${err.message}` };
	}
}

async function run() {
	console.log('\n  OpenMarket Activity Simulator\n');
	console.log(`  Tick:  ${TICK_MS}ms`);
	console.log(`  Max:   ${MAX_EVENTS} events\n`);

	await setup();

	let count = 0;
	const startTime = Date.now();

	const interval = setInterval(async () => {
		if (count >= MAX_EVENTS) {
			clearInterval(interval);
			const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
			console.log(`\n  Done! ${count} events in ${elapsed}s\n`);
			process.exit(0);
		}

		// 20% chance of a burst (3-5 rapid actions)
		if (Math.random() < 0.2) {
			const burstSize = Math.floor(Math.random() * 3) + 3;
			console.log(`  --- burst of ${burstSize} ---`);
			const results = await Promise.all(Array.from({ length: burstSize }, () => fireAction()));
			for (const r of results) {
				count++;
				console.log(`  [${new Date().toLocaleTimeString()}] #${count} ${r.name}: ${r.result}`);
			}
		} else {
			const r = await fireAction();
			count++;
			console.log(`  [${new Date().toLocaleTimeString()}] #${count} ${r.name}: ${r.result}`);
		}
	}, TICK_MS);

	process.on('SIGINT', () => {
		clearInterval(interval);
		console.log(`\n  Stopped. ${count} events in ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);
		process.exit(0);
	});
}

run().catch(err => { console.error('Failed:', err); process.exit(1); });
