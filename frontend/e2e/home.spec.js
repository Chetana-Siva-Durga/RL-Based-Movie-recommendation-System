import { test, expect } from '@playwright/test';

test('home mood flow returns a recommendation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Telugu Movie Recommender')).toBeVisible();
  await page.getByText('Happy', { exact: true }).click();
  await page.getByRole('button', { name: 'Get Recommendation' }).click();
  await expect(page.getByText(/This movie was recommended|Since you feel|I'm suggesting/i).first()).toBeVisible({
    timeout: 10_000,
  });
});
