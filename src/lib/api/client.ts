import { treaty } from '@elysiajs/eden';
import type { App } from '../../../server/src/index';

// @ts-expect-error - Type mismatch due to separate elysia installations in frontend/server
export const api = treaty<App>('http://localhost:3000');
