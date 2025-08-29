import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/db/schemas.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL! }
});
