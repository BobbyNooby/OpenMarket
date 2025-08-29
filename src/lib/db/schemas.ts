import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	created_at: timestamp().defaultNow().notNull(),
	discord_id: text().notNull().unique(), // unique → can be conflict target
	username: text().notNull(),
	display_name: text().notNull(),
	avatar_url: text(),
	description: text()
});

export const usersActivityTable = pgTable('users_activity', {
	user_id: integer()
		.primaryKey()
		.references(() => usersTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	is_active: boolean().notNull().default(false),
	last_activity_at: timestamp()
});
