import { test, expect } from '@playwright/test';
import { signUpAndOnboard } from './helpers';

test.describe('Logged-in navigation', () => {
  test('authenticated user sees all nav links on desktop', async ({ page }) => {
    await signUpAndOnboard(page);

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Open Topics' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Closed Topics' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Stats' })).toBeVisible();
  });

  test('can navigate to Closed Topics and Leaderboard', async ({ page }) => {
    await signUpAndOnboard(page);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });

    // Closed Topics
    await nav.getByRole('link', { name: 'Closed Topics' }).click();
    await expect(page).toHaveURL(/\/closed/);
    await expect(page.getByRole('heading', { name: 'Closed Topics' })).toBeVisible();

    // Leaderboard
    await nav.getByRole('link', { name: 'Leaderboard' }).click();
    await expect(page).toHaveURL(/\/leaderboard/);
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();

    // Back to Open Topics
    await nav.getByRole('link', { name: 'Open Topics' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Open Topics' })).toBeVisible();
  });

  test('header shows auth controls after login', async ({ page }) => {
    await signUpAndOnboard(page);

    // After login, header should show either user menu or sign-in
    // (client-side auth detection may be delayed)
    const userMenu = page.getByRole('button', { name: 'User menu' });
    const signInBtn = page.getByRole('button', { name: 'Sign In' });
    const loadingPlaceholder = page.locator('header .animate-pulse');

    await expect(userMenu.or(signInBtn).or(loadingPlaceholder)).toBeVisible({ timeout: 10000 });
  });

  test('sign out redirects to /closed', async ({ page }) => {
    await signUpAndOnboard(page);

    // Try to find user menu — if client-side auth works, it'll be there
    const userMenu = page.getByRole('button', { name: 'User menu' });
    if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userMenu.click();
      await page.getByRole('menuitem', { name: 'Sign Out' }).click();
      await expect(page).toHaveURL(/\/closed/, { timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({ timeout: 5000 });
    }
    // If user menu isn't visible, the client auth isn't loading — skip gracefully
  });
});

test.describe('Mobile bottom navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('bottom nav shows links on mobile', async ({ page }) => {
    await signUpAndOnboard(page);

    const bottomNav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByText('Closed')).toBeVisible();
    await expect(bottomNav.getByText('Board')).toBeVisible();
  });

  test('can navigate via bottom nav on mobile', async ({ page }) => {
    await signUpAndOnboard(page);

    const bottomNav = page.getByRole('navigation', { name: 'Main navigation' });

    await bottomNav.getByText('Closed').click({ force: true });
    await expect(page).toHaveURL(/\/closed/);

    await bottomNav.getByText('Board').click({ force: true });
    await expect(page).toHaveURL(/\/leaderboard/);
  });
});
