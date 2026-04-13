import { test, expect } from '@playwright/test';

test.describe('Profile & Settings', () => {
	test('profile settings page has all sections', async ({ page }) => {
		await page.goto('/settings/profile');
		await expect(page.getByText('Identity')).toBeVisible();
		await expect(page.getByText('About you')).toBeVisible();
		await expect(page.getByText('Social links', { exact: true })).toBeVisible();
	});

	test('notification settings page loads', async ({ page }) => {
		await page.goto('/settings/notifications');
		await expect(page.getByText(/notification/i).first()).toBeVisible();
	});

	test('language settings shows all languages', async ({ page }) => {
		await page.goto('/settings/language');
		await expect(page.getByText('English')).toBeVisible();
		await expect(page.getByText('Español')).toBeVisible();
		await expect(page.getByText('Français')).toBeVisible();
		await expect(page.getByText('日本語')).toBeVisible();
	});

	test('account settings page loads', async ({ page }) => {
		await page.goto('/settings/account');
		await expect(page.getByText(/account/i).first()).toBeVisible();
	});
});
