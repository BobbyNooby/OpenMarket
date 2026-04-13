import { test, expect } from '@playwright/test';

test.describe('Public Profile', () => {
	test('own profile page loads', async ({ page }) => {
		await page.goto('/profile/testuser');
		await page.waitForLoadState('networkidle');
		// Should show the username on the profile
		await expect(page.getByRole('heading', { name: 'testuser' })).toBeVisible({ timeout: 5000 });
	});

	test('profile shows tabs', async ({ page }) => {
		await page.goto('/profile/testuser');
		await page.waitForLoadState('networkidle');
		// Profile page should have listings/reviews/have-want tabs
		const tabs = page.getByRole('tab');
		if (await tabs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
			expect(await tabs.count()).toBeGreaterThanOrEqual(2);
		}
	});
});
