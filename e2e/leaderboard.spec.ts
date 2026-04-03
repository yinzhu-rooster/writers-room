import { test, expect } from '@playwright/test';

test.describe('Leaderboard', () => {
  test('leaderboard page loads with sort options', async ({ page }) => {
    await page.goto('/leaderboard');

    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();

    // Sort tabs
    await expect(page.getByRole('tab', { name: 'Total Laughs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Avg Laughs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Most Reps' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Top 3%' })).toBeVisible();
  });

  test('default sort is Total Laughs', async ({ page }) => {
    await page.goto('/leaderboard');

    const totalLaughsTab = page.getByRole('tab', { name: 'Total Laughs' });
    await expect(totalLaughsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch sort modes', async ({ page }) => {
    await page.goto('/leaderboard');

    await page.getByRole('tab', { name: 'Most Reps' }).click();
    await expect(page.getByRole('tab', { name: 'Most Reps' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Avg Laughs' }).click();
    await expect(page.getByRole('tab', { name: 'Avg Laughs' })).toHaveAttribute('aria-selected', 'true');
  });

  test('shows empty state when no data', async ({ page }) => {
    await page.goto('/leaderboard');
    // With a fresh DB, should show empty state or entries
    const emptyState = page.getByText('No data yet');
    const leaderboardEntry = page.locator('[class*="border-gray-200"]').first();
    await expect(emptyState.or(leaderboardEntry)).toBeVisible({ timeout: 5000 });
  });
});
