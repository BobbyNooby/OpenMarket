import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = 'test@openmarket.dev';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_USERNAME = 'testuser';

setup('authenticate', async ({ page }) => {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');

	// Try signing in first (user likely already exists from a previous run)
	await page.locator('#signin-email').fill(TEST_EMAIL);
	await page.locator('#signin-password').fill(TEST_PASSWORD);
	await page.getByRole('button', { name: /sign in$/i }).click();
	await page.waitForTimeout(3000);

	// If sign-in failed (still on login page), try registering
	if (page.url().includes('/login')) {
		await page.getByRole('tab', { name: /register/i }).click();
		await page.waitForTimeout(500);

		await page.locator('#register-username').fill(TEST_USERNAME);
		await page.locator('#register-email').fill(TEST_EMAIL);
		await page.locator('#register-password').fill(TEST_PASSWORD);

		// Wait for username availability check to complete
		await page.waitForTimeout(2000);

		// Click create account (force click in case it's briefly disabled)
		await page.getByRole('button', { name: /create account/i }).click({ force: true });
		await page.waitForTimeout(3000);
	}

	// Handle onboarding if redirected there
	if (page.url().includes('/onboarding')) {
		await page.locator('input[type="text"]').first().fill(TEST_USERNAME);
		await page.waitForTimeout(500);
		await page.getByRole('button', { name: /complete/i }).click();
		await page.waitForURL(url => !url.pathname.includes('/onboarding'), { timeout: 15000 });
	}

	// Verify we're not stuck on login
	expect(page.url()).not.toContain('/login');

	await page.context().storageState({ path: 'tests/.auth/user.json' });
});
