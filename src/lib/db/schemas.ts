// db/schema.ts
import { pgEnum, pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// --- enums ---
export const reviewType = pgEnum('review_type', ['upvote', 'downvote']);

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
	name: text('name').notNull(),
	description: text('description'),
	wiki_link: text('wiki_link'),
	image_url: text('image_url')
});
export const currenciesTable = pgTable('currencies', {
	id: uuid('id').primaryKey().defaultRandom(),
	created_at: timestamp('created_at').defaultNow().notNull(),
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
