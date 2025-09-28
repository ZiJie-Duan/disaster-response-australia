import { test, expect } from '@playwright/test';

test('map component loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#map')).toBeVisible();
});
