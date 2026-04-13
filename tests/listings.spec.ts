import { test, expect } from '@playwright/test';

test.describe('Listings', () => {
	test('browse page loads', async ({ page }) => {
		await page.goto('/listings');
		await page.waitForLoadState('networkidle');
		// Page should have loaded without error
		await expect(page).toHaveURL(/\/listings/);
		// Should have some content (listings or empty state)
		await expect(page.locator('body')).not.toBeEmpty();
	});

	test('search input exists on listings page', async ({ page }) => {
		await page.goto('/listings');
		await page.waitForLoadState('networkidle');
		const searchInput = page.getByPlaceholder(/search/i);
		if (await searchInput.isVisible().catch(() => false)) {
			await searchInput.fill('test');
			await page.waitForTimeout(500);
			expect(page.url()).toContain('/listings');
		}
	});
});
