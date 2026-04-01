import { db } from '../db/db';
import { listingsTable } from '../db/schemas';
import { eq, and, lt } from 'drizzle-orm';
import { createNotification } from '../services/notifications';

const EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function expireListings() {
	const now = new Date();

	const expired = await db
		.update(listingsTable)
		.set({ status: 'expired' })
		.where(
			and(
				eq(listingsTable.status, 'active'),
				lt(listingsTable.expires_at, now)
			)
		)
		.returning({ id: listingsTable.id, author_id: listingsTable.author_id });

	for (const listing of expired) {
		createNotification({
			userId: listing.author_id,
			type: "listing_expired",
			title: "Your listing has expired",
			body: "You can renew it from the listing page.",
			link: `/listings/${listing.id}`,
		});
	}

	if (expired.length > 0) {
		console.log(`\x1b[33m[expiry]\x1b[0m Expired ${expired.length} listing(s)`);
	}
}

export function startExpiryJob() {
	// Run once on boot
	expireListings().catch((err) => console.error('[expiry] Initial run failed:', err));

	// Then every hour
	setInterval(() => {
		expireListings().catch((err) => console.error('[expiry] Scheduled run failed:', err));
	}, EXPIRY_INTERVAL_MS);

	console.log('\x1b[33m[expiry]\x1b[0m Expiry job started (every 1h)');
}
