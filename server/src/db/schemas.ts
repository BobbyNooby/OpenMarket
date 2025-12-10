import { pgEnum, pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

// --- enums ---
export const reviewType = pgEnum('review_type', ['upvote', 'downvote']);
export const orderType = pgEnum('order_type', ['buy', 'sell']);
export const payingType = pgEnum('paying_type', ['each', 'total']);

// --- users ---
export const usersTable = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	created_at: timestamp('created_at').defaultNow().notNull(),
	discord_id: text('discord_id').notNull().unique(),
	username: text('username').notNull(),
	display_name: text('display_name').notNull(),
	avatar_url: text('avatar_url'),
	description: text('description')
});

// --- activity ---
export const usersActivityTable = pgTable('users_activity', {
	user_id: uuid('user_id')
		.primaryKey()
		.references(() => usersTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	is_active: boolean('is_active').notNull().default(false),
	last_activity_at: timestamp('last_activity_at').notNull().defaultNow()
});

// --- items/currencies (generic) ---
export const itemsTable = pgTable('items', {
	id: uuid('id').primaryKey().defaultRandom(),
	created_at: timestamp('created_at').defaultNow().notNull(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	wiki_link: text('wiki_link'),
	image_url: text('image_url')
});

export const currenciesTable = pgTable('currencies', {
	id: uuid('id').primaryKey().defaultRandom(),
	created_at: timestamp('created_at').defaultNow().notNull(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	wiki_link: text('wiki_link'),
	image_url: text('image_url')
});

// --- profile reviews ---
export const profileReviewsTable = pgTable('profile_reviews', {
	id: uuid('id').primaryKey().defaultRandom(),
	created_at: timestamp('created_at').defaultNow().notNull(),
	profile_user_id: uuid('profile_user_id')
		.notNull()
		.references(() => usersTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	voter_user_id: uuid('voter_user_id')
		.notNull()
		.references(() => usersTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	type: reviewType('type').notNull(),
	comment: text('comment')
});

// --- listings (market orders) ---
// A listing can request either an item OR a currency (one must be set, the other null)
export const listingsTable = pgTable('listings', {
	id: uuid('id').primaryKey().defaultRandom(),
	created_at: timestamp('created_at').defaultNow().notNull(),
	author_id: uuid('author_id')
		.notNull()
		.references(() => usersTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	requested_item_id: uuid('requested_item_id')
		.references(() => itemsTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	requested_currency_id: uuid('requested_currency_id')
		.references(() => currenciesTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	amount: integer('amount').notNull().default(1),
	order_type: orderType('order_type').notNull(),
	paying_type: payingType('paying_type').notNull().default('each'),
	is_active: boolean('is_active').notNull().default(true)
});

// --- listing offered items (many-to-many) ---
export const listingOfferedItemsTable = pgTable('listing_offered_items', {
	id: uuid('id').primaryKey().defaultRandom(),
	listing_id: uuid('listing_id')
		.notNull()
		.references(() => listingsTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	item_id: uuid('item_id')
		.notNull()
		.references(() => itemsTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	amount: integer('amount').notNull().default(1)
});

// --- listing offered currencies (many-to-many) ---
export const listingOfferedCurrenciesTable = pgTable('listing_offered_currencies', {
	id: uuid('id').primaryKey().defaultRandom(),
	listing_id: uuid('listing_id')
		.notNull()
		.references(() => listingsTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	currency_id: uuid('currency_id')
		.notNull()
		.references(() => currenciesTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	amount: integer('amount').notNull().default(1)
});

// --- Type exports ---
export type UserInsert = typeof usersTable.$inferInsert;
export type UserSelect = typeof usersTable.$inferSelect;
export type UserActivityInsert = typeof usersActivityTable.$inferInsert;
export type UserActivitySelect = typeof usersActivityTable.$inferSelect;
export type ItemInsert = typeof itemsTable.$inferInsert;
export type ItemSelect = typeof itemsTable.$inferSelect;
export type CurrencyInsert = typeof currenciesTable.$inferInsert;
export type CurrencySelect = typeof currenciesTable.$inferSelect;
export type ProfileReviewInsert = typeof profileReviewsTable.$inferInsert;
export type ProfileReviewSelect = typeof profileReviewsTable.$inferSelect;
export type ListingInsert = typeof listingsTable.$inferInsert;
export type ListingSelect = typeof listingsTable.$inferSelect;
export type ListingOfferedItemInsert = typeof listingOfferedItemsTable.$inferInsert;
export type ListingOfferedItemSelect = typeof listingOfferedItemsTable.$inferSelect;
export type ListingOfferedCurrencyInsert = typeof listingOfferedCurrenciesTable.$inferInsert;
export type ListingOfferedCurrencySelect = typeof listingOfferedCurrenciesTable.$inferSelect;
