import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = 'test@openmarket.dev';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_USERNAME = 'testuser';

setup('authenticate', async ({ page }) => {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');

	// Try signing in first (user may already exist from a previous run)
	await page.locator('#signin-email').fill(TEST_EMAIL);
	await page.locator('#signin-password').fill(TEST_PASSWORD);
	await page.getByRole('button', { name: /sign in$/i }).click();
	await page.waitForTimeout(3000);

	// If sign-in failed (still on login page), register instead
	if (page.url().includes('/login')) {
		await page.getByRole('tab', { name: /register/i }).click();
		await page.waitForTimeout(500);

		await page.locator('#register-username').fill(TEST_USERNAME);
		await page.locator('#register-email').fill(TEST_EMAIL);
		await page.locator('#register-password').fill(TEST_PASSWORD);

		await page.waitForTimeout(2000);

		await page.getByRole('button', { name: /create account/i }).click({ force: true });
		await page.waitForTimeout(3000);
	}

	// Handle onboarding if redirected there
	if (page.url().includes('/onboarding')) {
		// Wait for the page to fully load
		await page.waitForLoadState('networkidle');
		// Fill username — try multiple selectors since the form varies
		const usernameInput = page.locator('input[type="text"]').first();
		await usernameInput.clear();
		await usernameInput.fill(TEST_USERNAME);
		await page.waitForTimeout(1000);
		// Click complete setup
		await page.getByRole('button', { name: /complete/i }).click({ force: true });
		await page.waitForTimeout(5000);
	}

	// If we're STILL on onboarding or login, try navigating home
	if (page.url().includes('/onboarding') || page.url().includes('/login')) {
		// The onboarding might have succeeded but not redirected — try going home
		await page.goto('/');
		await page.waitForTimeout(2000);
	}

	// Verify we're authenticated
	const url = page.url();
	const isAuth = !url.includes('/login');
	if (!isAuth) {
		throw new Error(`Auth setup failed, stuck at: ${url}`);
	}

	await page.context().storageState({ path: 'tests/.auth/user.json' });
});
