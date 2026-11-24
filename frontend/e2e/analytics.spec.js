import { test, expect } from '@playwright/test';

test('analytics page renders dashboard', async ({ page }) => {
  await page.goto('/Analytics');
  await expect(page.getByRole('heading', { name: 'RL Agent Analytics' })).toBeVisible();
  await expect(page.getByText(/recommendation agent learns/i)).toBeVisible();
});
