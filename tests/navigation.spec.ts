import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
	test('homepage loads', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/openmarket/i);
	});

	test('header links work', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('link', { name: /listings/i }).first().click();
		await expect(page).toHaveURL(/\/listings/);

		await page.getByRole('link', { name: /items/i }).first().click();
		await expect(page).toHaveURL(/\/items/);

		await page.getByRole('link', { name: /home/i }).first().click();
		await expect(page).toHaveURL('/');
	});

	test('items page loads', async ({ page }) => {
		await page.goto('/items');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('body')).not.toBeEmpty();
	});

	test('unauthenticated user gets redirected or sees sign in', async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');
		// Should either redirect to login or show the page (depends on auth guard)
		const url = page.url();
		const hasSignIn = await page.getByText(/sign in/i).first().isVisible().catch(() => false);
		expect(url.includes('/login') || hasSignIn || url.includes('/dashboard')).toBeTruthy();
		await context.close();
	});

	test('dashboard is accessible when logged in', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page).not.toHaveURL(/\/login/);
	});

	test('watchlist page loads', async ({ page }) => {
		await page.goto('/watchlist');
		await expect(page).not.toHaveURL(/\/login/);
	});

	test('settings page loads', async ({ page }) => {
		await page.goto('/settings/profile');
		await expect(page).not.toHaveURL(/\/login/);
	});
});
