import { DATABASE_URL } from '$env/static/private';
import { drizzle } from 'drizzle-orm/postgres-js';

export const db = drizzle(DATABASE_URL);
