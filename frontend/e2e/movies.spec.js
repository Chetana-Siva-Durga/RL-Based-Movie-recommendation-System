import { test, expect } from '@playwright/test';

test('movie database loads and filters search', async ({ page }) => {
  await page.goto('/Movies');
  await expect(page.getByRole('heading', { name: 'Movie Database' })).toBeVisible();
  const search = page.getByPlaceholder('Search movies…');
  await search.fill('Baahubali');
  await expect(page.getByText(/Baahubali/i).first()).toBeVisible({ timeout: 10_000 });
});
