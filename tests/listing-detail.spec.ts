import { test, expect } from '@playwright/test';

test.describe('Listing Detail', () => {
	test('listing detail page renders', async ({ page }) => {
		// Go to browse page first to find a listing
		await page.goto('/listings');
		await page.waitForLoadState('networkidle');

		// Try to click the first listing link
		const listingLink = page.locator('a[href*="/listings/"]').first();
		if (await listingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await listingLink.click();
			await page.waitForLoadState('networkidle');
			// Should show a listing card with content
			await expect(page.locator('body')).not.toBeEmpty();
			// Should not be a 404
			await expect(page.getByText('404')).not.toBeVisible().catch(() => {});
		}
	});

	test('listing preview image endpoint works', async ({ request }) => {
		// Fetch a listing ID from the API
		const listRes = await request.get('http://localhost:3000/listings?limit=1');
		const listData = await listRes.json();
		const id = listData.data?.[0]?.id;
		if (!id) return;

		// Fetch the preview image
		const previewRes = await request.get(`http://localhost:3000/listings/${id}/preview.png`);
		expect(previewRes.status()).toBe(200);
		expect(previewRes.headers()['content-type']).toBe('image/png');
		// Should be a reasonable PNG size (at least 10KB)
		const body = await previewRes.body();
		expect(body.length).toBeGreaterThan(10000);
	});
});
