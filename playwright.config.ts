import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	retries: 0,
	workers: 1,
	timeout: 30000,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	webServer: [
		{
			command: 'pnpm dev:server',
			port: 3000,
			reuseExistingServer: true,
			timeout: 30000,
		},
		{
			command: 'pnpm dev:frontend',
			port: 5173,
			reuseExistingServer: true,
			timeout: 30000,
		},
	],
	projects: [
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/,
			timeout: 60000,
		},
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
				storageState: 'tests/.auth/user.json',
			},
			dependencies: ['setup'],
		},
	],
});
