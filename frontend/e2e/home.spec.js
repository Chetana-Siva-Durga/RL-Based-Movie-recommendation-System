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

test('movie title input can be selected with Enter and used for recommendations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Movie' }).click();

  const search = page.getByPlaceholder('Search for a Telugu movie...');
  await search.fill('Baahubali: The Beginning');
  await expect(page.getByRole('button', { name: /Baahubali: The Beginning/ })).toBeVisible();
  await search.press('Enter');
  await expect(page.getByRole('button', { name: 'Get Recommendation' })).toBeEnabled();

  const recommendationResponse = page.waitForResponse(response =>
    response.url().includes('/recommend/') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Get Recommendation' }).click();
  const response = await recommendationResponse;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON().reference_movie_id).toBeTruthy();
  await expect(page.getByText('Why this recommendation?')).toBeVisible();
});
