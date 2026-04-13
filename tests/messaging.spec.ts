import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
	test('messages page loads', async ({ page }) => {
		await page.goto('/messages');
		await page.waitForLoadState('networkidle');
		await expect(page).not.toHaveURL(/\/login/);
		// Should show messages UI or empty state
		await expect(page.locator('body')).not.toBeEmpty();
	});
});
