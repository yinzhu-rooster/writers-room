import { test, expect } from '@playwright/test';

test.describe('User Stats', () => {
  test('stats page shows sign-in prompt for visitors', async ({ page }) => {
    await page.goto('/stats');
    const signInPrompt = page.getByText('Sign in to view your stats');
    const redirected = page.getByRole('heading', { name: 'Closed Topics' });
    await expect(signInPrompt.or(redirected)).toBeVisible({ timeout: 5000 });
  });
});
