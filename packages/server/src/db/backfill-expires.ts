import { db } from './db';
import { listingsTable } from './schemas';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function backfill() {
	// Fix: set expires_at to 30 days from NOW for all existing listings
	// Also restore any that were incorrectly expired by the boot job
	const restored = await db
		.update(listingsTable)
		.set({
			expires_at: sql`now() + interval '30 days'`,
			status: 'active'
		})
		.where(eq(listingsTable.status, 'expired'))
		.returning({ id: listingsTable.id });

	console.log(`Restored ${restored.length} listing(s) to active with 30-day expiry`);

	// Also update active/paused listings that have old expires_at
	const updated = await db
		.update(listingsTable)
		.set({
			expires_at: sql`now() + interval '30 days'`
		})
		.where(sql`${listingsTable.expires_at} < now()`)
		.returning({ id: listingsTable.id });

	console.log(`Updated ${updated.length} listing(s) with new expiry`);
	process.exit(0);
}

backfill().catch((err) => {
	console.error('Backfill failed:', err);
	process.exit(1);
});
