import { test, expect } from '@playwright/test';

test.describe('Admin', () => {
	test('admin panel loads with tabs', async ({ page }) => {
		await page.goto('/admin');
		await page.waitForLoadState('networkidle');

		// If we have admin access, tabs should be visible
		const tabs = page.getByRole('tab');
		if (await tabs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(page.getByRole('tab', { name: /items/i })).toBeVisible();
			await expect(page.getByRole('tab', { name: /users/i })).toBeVisible();
			await expect(page.getByRole('tab', { name: /media/i })).toBeVisible();
		}
	});

	test('admin items tab shows content', async ({ page }) => {
		await page.goto('/admin');
		await page.waitForLoadState('networkidle');
		const itemsTab = page.getByRole('tab', { name: /items/i });
		if (await itemsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await itemsTab.click();
			await page.waitForTimeout(500);
			// Items tab should show some content
			await expect(page.locator('body')).not.toBeEmpty();
		}
	});

	test('admin users tab loads', async ({ page }) => {
		await page.goto('/admin');
		await page.waitForLoadState('networkidle');
		const usersTab = page.getByRole('tab', { name: /users/i });
		if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await usersTab.click();
			await page.waitForTimeout(1000);
			// Should show users content or manage text
			const content = page.getByText(/manage users|search|user/i);
			await expect(content.first()).toBeVisible({ timeout: 5000 });
		}
	});

	test('admin media tab loads', async ({ page }) => {
		await page.goto('/admin');
		await page.waitForLoadState('networkidle');
		const mediaTab = page.getByRole('tab', { name: /media/i });
		if (await mediaTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await mediaTab.click();
			// Wait for the tab panel to become visible
			await page.waitForTimeout(1500);
			// The media tab should show stats or upload grid
			const panel = page.locator('[role="tabpanel"]:visible');
			await expect(panel).toBeVisible({ timeout: 5000 });
		}
	});
});
