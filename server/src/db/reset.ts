import { db } from './db';
import { sql } from 'drizzle-orm';

async function reset() {
	console.log('🗑️  Dropping all tables...');

	// Drop tables in reverse dependency order
	await db.execute(sql`DROP TABLE IF EXISTS listing_offered_currencies CASCADE`);
	await db.execute(sql`DROP TABLE IF EXISTS listing_offered_items CASCADE`);
	await db.execute(sql`DROP TABLE IF EXISTS listings CASCADE`);
	await db.execute(sql`DROP TABLE IF EXISTS profile_reviews CASCADE`);
	await db.execute(sql`DROP TABLE IF EXISTS users_activity CASCADE`);
	await db.execute(sql`DROP TABLE IF EXISTS currencies CASCADE`);
	await db.execute(sql`DROP TABLE IF EXISTS items CASCADE`);
	await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);

	// Drop enums
	await db.execute(sql`DROP TYPE IF EXISTS review_type CASCADE`);
	await db.execute(sql`DROP TYPE IF EXISTS order_type CASCADE`);
	await db.execute(sql`DROP TYPE IF EXISTS paying_type CASCADE`);

	console.log('✅ All tables dropped!');
	process.exit(0);
}

reset().catch((err) => {
	console.error('❌ Reset failed:', err);
	process.exit(1);
});
