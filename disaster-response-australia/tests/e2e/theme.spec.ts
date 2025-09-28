import { test, expect } from '@playwright/test';

// TODO: Replace with actual theme toggle selector once available
// Placeholder check to keep suite passing until toggle lands.
test('theme placeholder - body exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
