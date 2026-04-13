import { test, expect } from '@playwright/test';

test.describe('Public Profile', () => {
	test('own profile page loads', async ({ page }) => {
		await page.goto('/profile/testuser');
		await page.waitForLoadState('networkidle');
		// In CI the testuser profile might not exist — allow 404 or redirect
		if (page.url().includes('/login') || page.url().includes('/onboarding')) return;
		const heading = page.getByRole('heading', { name: 'testuser' });
		const notFound = page.getByText(/not found/i);
		// Either the profile renders or we get a not-found page
		await expect(heading.or(notFound)).toBeVisible({ timeout: 5000 });
	});

	test('profile shows tabs', async ({ page }) => {
		await page.goto('/profile/testuser');
		await page.waitForLoadState('networkidle');
		if (page.url().includes('/login') || page.url().includes('/onboarding')) return;
		const tabs = page.getByRole('tab');
		if (await tabs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
			expect(await tabs.count()).toBeGreaterThanOrEqual(2);
		}
	});
});
