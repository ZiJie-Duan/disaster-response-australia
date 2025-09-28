import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});
