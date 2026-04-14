// Activity Simulator — hits the live API as random seeded users
// Usage: bun --env-file=../../.env scripts/simulate.ts [--tick=2000] [--max=100]
//
// Creates realistic traffic: browsing, listing creation, watchlisting,
// messaging, reviews, and more. Great for demos and populating analytics.

import { db } from '../src/db/db';
import { session as sessionTable, user } from '../src/db/schemas';
import { userProfilesTable } from '../src/db/schemas';
import { eq, sql } from 'drizzle-orm';

const API_URL = process.env.PUBLIC_API_URL || 'http://localhost:3000';

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string, fallback: number): number {
	const arg = args.find(a => a.startsWith(`--${name}=`));
	return arg ? parseInt(arg.split('=')[1], 10) : fallback;
}
const TICK_MS = getArg('tick', 2000);
const MAX_EVENTS = getArg('max', 200);

// Weighted action list
const ACTIONS = [
	{ name: 'browse', weight: 30, fn: browseListing },
	{ name: 'view', weight: 20, fn: viewListing },
	{ name: 'watchlist', weight: 10, fn: toggleWatchlist },
	{ name: 'create_listing', weight: 8, fn: createListing },
	{ name: 'review', weight: 8, fn: submitReview },
	{ name: 'message', weight: 7, fn: sendMessage },
	{ name: 'have_want', weight: 5, fn: toggleHaveWant },
	{ name: 'pause_listing', weight: 4, fn: pauseListing },
	{ name: 'track', weight: 8, fn: trackPageView },
];

const totalWeight = ACTIONS.reduce((sum, a) => sum + a.weight, 0);

function pickAction() {
	let r = Math.random() * totalWeight;
	for (const action of ACTIONS) {
		r -= action.weight;
		if (r <= 0) return action;
	}
	return ACTIONS[0];
}

function randomChoice<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

// Session cache: userId -> cookie string
const sessions = new Map<string, string>();
let userList: { id: string; username: string }[] = [];
let itemIds: string[] = [];
let currencyIds: string[] = [];
let listingIds: string[] = [];

async function setup() {
	// Get all seeded users (test emails)
	const users = await db
		.select({ id: user.id, username: userProfilesTable.username })
		.from(user)
		.innerJoin(userProfilesTable, eq(user.id, userProfilesTable.userId))
		.where(sql`${user.email} LIKE '%@openmarket.test'`);

	if (users.length === 0) {
		console.error('No seeded users found. Run pnpm db:seed first.');
		process.exit(1);
	}
	userList = users;

	// Create sessions for all users (or reuse existing)
	for (const u of userList) {
		const token = `sim_${u.id}_${Date.now()}`;
		const sessionId = crypto.randomUUID();
		await db.insert(sessionTable).values({
			id: sessionId,
			token,
			userId: u.id,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			updatedAt: new Date(),
			userAgent: 'OpenMarket-Simulator/1.0',
			ipAddress: '127.0.0.1',
		}).onConflictDoNothing();
		sessions.set(u.id, `better-auth.session_token=${token}`);
	}

	// Fetch items, currencies, listings
	const [itemsRes, currRes, listRes] = await Promise.all([
		apiFetch('/items'),
		apiFetch('/currencies'),
		apiFetch('/listings?limit=50'),
	]);
	itemIds = (itemsRes?.data ?? []).map((i: any) => i.id);
	currencyIds = (currRes?.data ?? []).map((c: any) => c.id);
	listingIds = (listRes?.data ?? []).map((l: any) => l.id);

	console.log(`Loaded ${userList.length} users, ${itemIds.length} items, ${currencyIds.length} currencies, ${listingIds.length} listings`);
}

// API helpers
async function apiFetch(path: string, init?: RequestInit & { cookie?: string }) {
	const headers: Record<string, string> = { ...(init?.headers as Record<string, string> ?? {}) };
	if (init?.cookie) headers['Cookie'] = init.cookie;
	if (init?.body && typeof init.body === 'string') headers['Content-Type'] = 'application/json';
	try {
		const res = await fetch(`${API_URL}${path}`, { ...init, headers });
		return res.json();
	} catch {
		return { success: false };
	}
}

function randomUser() {
	const u = randomChoice(userList);
	return { ...u, cookie: sessions.get(u.id)! };
}

// Action handlers
async function browseListing() {
	const u = randomUser();
	await apiFetch('/listings?limit=12&offset=0', { cookie: u.cookie });
	return `${u.username} browsed listings`;
}

async function viewListing() {
	if (listingIds.length === 0) return 'no listings to view';
	const u = randomUser();
	const id = randomChoice(listingIds);
	await apiFetch(`/listings/${id}`, { cookie: u.cookie });
	return `${u.username} viewed listing ${id.slice(0, 8)}`;
}

async function toggleWatchlist() {
	if (listingIds.length === 0) return 'no listings to watchlist';
	const u = randomUser();
	const id = randomChoice(listingIds);
	await apiFetch(`/watchlist/${id}`, { method: 'POST', cookie: u.cookie });
	return `${u.username} toggled watchlist on ${id.slice(0, 8)}`;
}

async function createListing() {
	const u = randomUser();
	const requestsItem = Math.random() > 0.2;
	const body: any = {
		amount: Math.floor(Math.random() * 10) + 1,
		order_type: Math.random() > 0.5 ? 'buy' : 'sell',
		paying_type: Math.random() > 0.7 ? 'total' : 'each',
		offered_items: [],
		offered_currencies: [],
	};

	if (requestsItem && itemIds.length > 0) {
		body.requested_item_id = randomChoice(itemIds);
		if (currencyIds.length > 0) {
			body.offered_currencies = [{ currency_id: randomChoice(currencyIds), amount: Math.floor(Math.random() * 10000) + 100 }];
		}
	} else if (currencyIds.length > 0) {
		body.requested_currency_id = randomChoice(currencyIds);
		body.amount = Math.floor(Math.random() * 50000) + 1000;
		if (itemIds.length > 0) {
			body.offered_items = [{ item_id: randomChoice(itemIds), amount: Math.floor(Math.random() * 5) + 1 }];
		}
	} else {
		return 'no items or currencies available';
	}

	const res = await apiFetch('/listings', { method: 'POST', body: JSON.stringify(body), cookie: u.cookie });
	if (res?.success && res?.data?.id) {
		listingIds.push(res.data.id);
	}
	return `${u.username} created a ${body.order_type} listing`;
}

async function submitReview() {
	const reviewer = randomUser();
	const target = randomChoice(userList.filter(u => u.id !== reviewer.id));
	if (!target) return 'not enough users for review';
	const body = {
		type: Math.random() > 0.15 ? 'upvote' : 'downvote',
		comment: Math.random() > 0.3 ? randomChoice([
			'Great trader!', 'Fast response', 'Good deal', 'Smooth trade',
			'Would trade again', 'Reliable', 'Fair prices', 'Friendly',
		]) : undefined,
	};
	await apiFetch(`/users/profile/${target.username}/reviews`, {
		method: 'POST',
		body: JSON.stringify(body),
		cookie: reviewer.cookie,
	});
	return `${reviewer.username} reviewed ${target.username}`;
}

async function sendMessage() {
	const sender = randomUser();
	const target = randomChoice(userList.filter(u => u.id !== sender.id));
	if (!target) return 'not enough users for message';

	// Start or get conversation
	const convRes = await apiFetch('/api/conversations', {
		method: 'POST',
		body: JSON.stringify({ target_user_id: target.id }),
		cookie: sender.cookie,
	});
	const convId = convRes?.data?.id;
	if (!convId) return `${sender.username} failed to start conversation`;

	const messages = [
		'hey, interested in trading?', 'got any good deals?', 'how much for that?',
		'still available?', 'nice collection!', 'want to trade?', 'good price',
		'deal!', 'thanks for the trade', 'looking for anything specific?',
	];
	await apiFetch(`/api/conversations/${convId}/messages`, {
		method: 'POST',
		body: JSON.stringify({ content: randomChoice(messages) }),
		cookie: sender.cookie,
	});
	return `${sender.username} messaged ${target.username}`;
}

async function toggleHaveWant() {
	const u = randomUser();
	const listType = Math.random() > 0.5 ? 'have' : 'want';
	const isItem = Math.random() > 0.3;
	const body: any = { list_type: listType };
	if (isItem && itemIds.length > 0) {
		body.item_id = randomChoice(itemIds);
	} else if (currencyIds.length > 0) {
		body.currency_id = randomChoice(currencyIds);
	} else {
		return 'no items to add';
	}
	await apiFetch(`/lists/${u.id}`, { method: 'POST', body: JSON.stringify(body), cookie: u.cookie });
	return `${u.username} updated ${listType} list`;
}

async function pauseListing() {
	if (listingIds.length === 0) return 'no listings to pause';
	const u = randomUser();
	const id = randomChoice(listingIds);
	const status = Math.random() > 0.5 ? 'paused' : 'active';
	await apiFetch(`/listings/${id}/status`, {
		method: 'PATCH',
		body: JSON.stringify({ status }),
		cookie: u.cookie,
	});
	return `${u.username} set listing ${id.slice(0, 8)} to ${status}`;
}

async function trackPageView() {
	const u = randomUser();
	const pages = ['/', '/listings', '/items', '/dashboard', '/watchlist', '/messages'];
	const path = randomChoice(pages);
	await apiFetch('/telemetry/track', {
		method: 'POST',
		body: JSON.stringify({
			event_type: 'page_view',
			path,
			session_id: `sim_${u.id}`,
		}),
		cookie: u.cookie,
	});
	return `${u.username} viewed ${path}`;
}

// Main loop
async function run() {
	console.log('\n  OpenMarket Activity Simulator\n');
	console.log(`  API:    ${API_URL}`);
	console.log(`  Tick:   ${TICK_MS}ms`);
	console.log(`  Max:    ${MAX_EVENTS} events\n`);

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

		const action = pickAction();
		try {
			const result = await action.fn();
			count++;
			const time = new Date().toLocaleTimeString();
			console.log(`  [${time}] #${count} ${action.name}: ${result}`);
		} catch (err: any) {
			console.error(`  [ERROR] ${action.name}: ${err.message}`);
		}
	}, TICK_MS);

	// Graceful shutdown
	process.on('SIGINT', () => {
		clearInterval(interval);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`\n  Stopped. ${count} events in ${elapsed}s\n`);
		process.exit(0);
	});
}

run().catch((err) => {
	console.error('Simulator failed:', err);
	process.exit(1);
});
