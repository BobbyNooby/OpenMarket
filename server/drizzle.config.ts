import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle',
	schema: ['./src/db/schemas.ts', './src/db/auth-schema.ts'],
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL! }
});
