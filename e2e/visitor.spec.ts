import { test, expect } from '@playwright/test';

test.describe('Visitor experience (unauthenticated)', () => {
  test('visitor hitting / is redirected to /closed', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/closed/);
  });

  test('visitor sees Closed Topics page with header nav', async ({ page }) => {
    await page.goto('/closed');

    // Header elements
    await expect(page.getByText('Writers Room')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Page content
    await expect(page.getByRole('heading', { name: 'Closed Topics' })).toBeVisible();
  });

  test('visitor can navigate to Leaderboard', async ({ page }) => {
    await page.goto('/closed');

    // Desktop nav link
    const leaderboardLink = page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Leaderboard' });
    await leaderboardLink.click();

    await expect(page).toHaveURL(/\/leaderboard/);
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  });

  test('visitor cannot access Open Topics directly', async ({ page }) => {
    // Middleware should redirect / to /closed
    await page.goto('/');
    await expect(page).toHaveURL(/\/closed/);
  });

  test('visitor cannot access Stats page without auth', async ({ page }) => {
    await page.goto('/stats');
    // Should either redirect or show sign-in prompt
    const signInPrompt = page.getByText('Sign in to view your stats');
    const redirected = page.getByRole('heading', { name: 'Closed Topics' });
    await expect(signInPrompt.or(redirected)).toBeVisible({ timeout: 5000 });
  });

  test('visitor sees Sign In button, not a loading spinner forever', async ({ page }) => {
    await page.goto('/closed');
    // Sign In button should appear within a reasonable time (not stuck loading)
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({ timeout: 5000 });
  });
});
