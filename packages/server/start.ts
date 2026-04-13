// Production startup script
// Pushes DB schema, seeds RBAC + minimal catalog if empty, then starts the server

import { execSync } from 'node:child_process';

console.log('Pushing database schema...');
try {
	execSync('bunx drizzle-kit push', { stdio: 'inherit' });
} catch (err) {
	console.error('Schema push failed:', err);
	process.exit(1);
}

console.log('Seeding RBAC...');
try {
	const { seedRbac } = await import('./src/db/rbac-seed');
	await seedRbac();
} catch {
	// Already seeded from a previous boot
}

// Check if the catalog is empty and seed minimal starter data
try {
	const { db } = await import('./src/db/db');
	const { itemsTable, currenciesTable, itemCategoriesTable } = await import('./src/db/schemas');
	const { count } = await import('drizzle-orm');

	const [{ n }] = await db.select({ n: count() }).from(itemsTable);
	if (n === 0) {
		console.log('Empty catalog detected, seeding starter items...');

		const cats = await db.insert(itemCategoriesTable).values([
			{ name: 'Weapons', slug: 'weapons' },
			{ name: 'Armor', slug: 'armor' },
			{ name: 'Consumables', slug: 'consumables' },
		]).returning();
		const catMap = new Map(cats.map(c => [c.slug, c.id]));

		await db.insert(itemsTable).values([
			{ name: 'Iron Sword', slug: 'iron-sword', description: 'A basic iron sword.', image_url: 'https://placehold.co/128x128/1a1a2e/6366f1?text=Sword', category_id: catMap.get('weapons') },
			{ name: 'Steel Shield', slug: 'steel-shield', description: 'A sturdy steel shield.', image_url: 'https://placehold.co/128x128/1a1a2e/64748b?text=Shield', category_id: catMap.get('armor') },
			{ name: 'Health Potion', slug: 'health-potion', description: 'Restores health.', image_url: 'https://placehold.co/128x128/1a1a2e/22c55e?text=Potion', category_id: catMap.get('consumables') },
			{ name: 'Fire Staff', slug: 'fire-staff', description: 'A staff imbued with fire magic.', image_url: 'https://placehold.co/128x128/1a1a2e/ef4444?text=Staff', category_id: catMap.get('weapons') },
			{ name: 'Leather Boots', slug: 'leather-boots', description: 'Light and comfortable boots.', image_url: 'https://placehold.co/128x128/1a1a2e/f59e0b?text=Boots', category_id: catMap.get('armor') },
		]);

		await db.insert(currenciesTable).values([
			{ name: 'Gold', slug: 'gold', description: 'Standard currency.', image_url: 'https://placehold.co/128x128/1a1a2e/f59e0b?text=Gold' },
			{ name: 'Gems', slug: 'gems', description: 'Premium currency.', image_url: 'https://placehold.co/128x128/1a1a2e/ec4899?text=Gems' },
		]);

		console.log('Starter catalog seeded: 5 items, 2 currencies, 3 categories');
	}
} catch (err) {
	console.error('Auto-seed check failed:', err);
}

console.log('Starting server...');
await import('./src/index');
