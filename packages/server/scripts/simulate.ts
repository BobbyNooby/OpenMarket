// Activity Simulator — creates realistic marketplace traffic directly via DB
// Usage: bun --env-file=../../.env scripts/simulate.ts [--tick=2000] [--max=100]

import { db } from '../src/db/db';
import { user, userProfilesTable, listingsTable, listingOfferedItemsTable, listingOfferedCurrenciesTable, itemsTable, currenciesTable, profileReviewsTable, watchlistTable } from '../src/db/schemas';
import { eq, sql } from 'drizzle-orm';
import { listingSelectShape, requestedCurrencyTable, fetchOfferedForListings, serializeListing } from '../src/routes/listings/shared';
import { trackEvent } from '../src/services/analytics';

// For broadcast, always use localhost since the endpoint is localhost-only
const API_URL = 'http://localhost:3000';

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

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const PAGE_PATHS = ['/', '/listings', '/items', '/dashboard', '/watchlist', '/profile'];
const SEARCH_QUERIES = ['sword', 'rare', 'gold', 'armor', 'skin', 'legendary', 'cheap', 'bundle', 'rune', 'pet'];
const FILTER_CHOICES: Array<{ filter_type: string; value: string }> = [
	{ filter_type: 'order_type', value: 'buy' },
	{ filter_type: 'order_type', value: 'sell' },
	{ filter_type: 'paying_type', value: 'each' },
	{ filter_type: 'paying_type', value: 'total' },
	{ filter_type: 'status', value: 'active' },
];

const ACTIONS = [
	{ name: 'page_view', weight: 15, fn: pageView },
	{ name: 'listing_view', weight: 20, fn: viewListing },
	{ name: 'create_listing', weight: 15, fn: createListing },
	{ name: 'search', weight: 10, fn: runSearch },
	{ name: 'filter_applied', weight: 5, fn: applyFilter },
	{ name: 'suggestion_clicked', weight: 4, fn: clickSuggestion },
	{ name: 'profile_view', weight: 8, fn: viewProfile },
	{ name: 'listing_contact', weight: 5, fn: contactListing },
	{ name: 'review', weight: 7, fn: submitReview },
	{ name: 'watchlist', weight: 6, fn: toggleWatchlist },
	{ name: 'pause_listing', weight: 3, fn: pauseListing },
	{ name: 'listing_renewed', weight: 2, fn: renewListing },
];

const totalWeight = ACTIONS.reduce((sum, a) => sum + a.weight, 0);
function pickAction() {
	let r = Math.random() * totalWeight;
	for (const a of ACTIONS) { r -= a.weight; if (r <= 0) return a; }
	return ACTIONS[0];
}

let userList: { id: string; username: string }[] = [];
let itemList: { id: string; name: string }[] = [];
let currencyList: { id: string; name: string }[] = [];
let itemIds: string[] = [];
let currencyIds: string[] = [];
let listingIds: string[] = [];
const listingAuthors = new Map<string, string>();
const sessionsByUser = new Map<string, string>();

function sessionFor(userId: string): string {
	let s = sessionsByUser.get(userId);
	if (!s) {
		s = `sim-${Math.random().toString(36).slice(2, 12)}`;
		sessionsByUser.set(userId, s);
	}
	return s;
}

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

	const items = await db.select({ id: itemsTable.id, name: itemsTable.name }).from(itemsTable);
	const currencies = await db.select({ id: currenciesTable.id, name: currenciesTable.name }).from(currenciesTable);
	const listings = await db.select({ id: listingsTable.id, author_id: listingsTable.author_id }).from(listingsTable).limit(50);

	itemList = items;
	currencyList = currencies;
	itemIds = items.map(i => i.id);
	currencyIds = currencies.map(c => c.id);
	listingIds = listings.map(l => l.id);
	for (const l of listings) listingAuthors.set(l.id, l.author_id);

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
	listingAuthors.set(listing.id, u.id);

	trackEvent({
		type: 'listing_created',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path: '/listings/new',
		metadata: {
			listing_id: listing.id,
			order_type: values.order_type,
			item_id: values.requested_item_id ?? undefined,
		},
	});

	// Add offered items/currencies
	if (currencyIds.length > 0 && !values.requested_currency_id) {
		const numCurr = randomInt(1, Math.min(3, currencyIds.length));
		const shuffled = [...currencyIds].sort(() => Math.random() - 0.5);
		for (let i = 0; i < numCurr; i++) {
			await db.insert(listingOfferedCurrenciesTable).values({
				listing_id: listing.id,
				currency_id: shuffled[i],
				amount: randomInt(100, 10000),
			});
		}
	}
	if (itemIds.length > 0 && values.requested_currency_id) {
		const numItems = randomInt(1, Math.min(7, itemIds.length));
		const shuffled = [...itemIds].sort(() => Math.random() - 0.5);
		for (let i = 0; i < numItems; i++) {
			await db.insert(listingOfferedItemsTable).values({
				listing_id: listing.id,
				item_id: shuffled[i],
				amount: randomInt(1, 5),
			});
		}
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

	const reviewType = Math.random() > 0.15 ? 'upvote' : 'downvote';
	const comments = ['Great trader!', 'Fast response', 'Good deal', 'Smooth trade', 'Reliable', 'Fair prices', 'Friendly'];
	await db.insert(profileReviewsTable).values({
		profile_user_id: target.id,
		voter_user_id: reviewer.id,
		type: reviewType,
		comment: Math.random() > 0.3 ? randomChoice(comments) : null,
	}).onConflictDoNothing();

	trackEvent({
		type: 'review_submitted',
		userId: reviewer.id,
		sessionId: sessionFor(reviewer.id),
		path: `/u/${target.username}`,
		metadata: { target_user_id: target.id, type: reviewType },
	});

	return `${reviewer.username} ${reviewType}d ${target.username}`;
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

async function pageView() {
	const u = randomUser();
	const path = randomChoice(PAGE_PATHS);
	trackEvent({
		type: 'page_view',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path,
	});
	return `${u.username} viewed ${path}`;
}

async function viewListing() {
	if (listingIds.length === 0) return 'no listings';
	const u = randomUser();
	const id = randomChoice(listingIds);
	const source = randomChoice(['browse', 'search', 'direct'] as const);
	trackEvent({
		type: 'listing_view',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path: `/listing/${id}`,
		metadata: { listing_id: id, source },
	});
	return `${u.username} viewed listing ${id.slice(0, 8)} (${source})`;
}

async function runSearch() {
	const u = randomUser();
	const query = randomChoice(SEARCH_QUERIES);
	trackEvent({
		type: 'search',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path: '/listings',
		metadata: { query, result_count: randomInt(0, 50) },
	});
	return `${u.username} searched "${query}"`;
}

async function applyFilter() {
	const u = randomUser();
	const choice = randomChoice(FILTER_CHOICES);
	trackEvent({
		type: 'filter_applied',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path: '/listings',
		metadata: { filter_type: choice.filter_type, value: choice.value },
	});
	return `${u.username} filtered ${choice.filter_type}=${choice.value}`;
}

async function clickSuggestion() {
	const u = randomUser();
	const useItem = Math.random() > 0.5 && itemList.length > 0;
	const entry = useItem ? randomChoice(itemList) : (currencyList.length > 0 ? randomChoice(currencyList) : null);
	if (!entry) return 'no items or currencies';
	const kind: 'item' | 'currency' = useItem ? 'item' : 'currency';
	trackEvent({
		type: 'suggestion_clicked',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path: '/listings',
		metadata: { type: kind, id: entry.id, name: entry.name, query: randomChoice(SEARCH_QUERIES) },
	});
	return `${u.username} clicked ${kind} suggestion ${entry.name}`;
}

async function viewProfile() {
	const u = randomUser();
	const target = randomChoice(userList.filter(x => x.id !== u.id));
	if (!target) return 'not enough users';
	trackEvent({
		type: 'profile_view',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path: `/u/${target.username}`,
		metadata: { target_user_id: target.id },
	});
	return `${u.username} viewed ${target.username}'s profile`;
}

async function contactListing() {
	if (listingIds.length === 0) return 'no listings';
	const u = randomUser();
	const id = randomChoice(listingIds);
	const authorId = listingAuthors.get(id);
	if (!authorId || authorId === u.id) return 'skipped self-contact';
	trackEvent({
		type: 'listing_contact',
		userId: u.id,
		sessionId: sessionFor(u.id),
		path: `/listing/${id}`,
		metadata: { listing_id: id, author_id: authorId },
	});
	return `${u.username} contacted listing ${id.slice(0, 8)}`;
}

async function renewListing() {
	if (listingIds.length === 0) return 'no listings';
	const id = randomChoice(listingIds);
	const authorId = listingAuthors.get(id);
	if (!authorId) return 'unknown author';
	const newExpiry = new Date(Date.now() + 30 * 86400000);
	await db.update(listingsTable).set({ expires_at: newExpiry }).where(eq(listingsTable.id, id));
	trackEvent({
		type: 'listing_renewed',
		userId: authorId,
		sessionId: sessionFor(authorId),
		path: `/listing/${id}`,
		metadata: { listing_id: id },
	});
	return `renewed ${id.slice(0, 8)}`;
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
