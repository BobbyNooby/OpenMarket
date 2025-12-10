import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
	DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET,
	BETTER_AUTH_SECRET,
	DATABASE_URL
} from '$env/static/private';
import * as schema from './auth-schema';
import { eq } from 'drizzle-orm';

import { drizzle } from 'drizzle-orm/postgres-js';

export const db = drizzle(DATABASE_URL);

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification
		}
	}),
	secret: BETTER_AUTH_SECRET,
	socialProviders: {
		discord: {
			clientId: DISCORD_CLIENT_ID,
			clientSecret: DISCORD_CLIENT_SECRET,
			mapProfileToUser: (profile) => {
				const avatarUrl = profile.avatar
					? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
					: profile.image; // fallback to default

				return {
					name: profile.username, // Use Discord username as the name
					email: profile.email,
					image: avatarUrl
				};
			}
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24 // 1 day
	},
	// Hooks to sync user profile after auth events
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					// Create user profile with Discord username
					// The username is stored in `name` field from mapProfileToUser
					try {
						await db
							.insert(schema.userProfile)
							.values({
								userId: user.id,
								username: user.name, // Discord username
								description: null
							})
							.onConflictDoUpdate({
								target: schema.userProfile.userId,
								set: {
									username: user.name
								}
							});
						console.log(`Created profile for user: ${user.name}`);
					} catch (err) {
						console.error('Failed to create user profile:', err);
					}
				}
			},
			update: {
				after: async (user) => {
					// Update username if it changed
					try {
						await db
							.update(schema.userProfile)
							.set({ username: user.name })
							.where(eq(schema.userProfile.userId, user.id));
						console.log(`Updated profile for user: ${user.name}`);
					} catch (err) {
						console.error('Failed to update user profile:', err);
					}
				}
			}
		}
	}
});
