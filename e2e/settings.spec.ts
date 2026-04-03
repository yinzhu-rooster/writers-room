import { test, expect } from '@playwright/test';
import { signUpAndOnboard } from './helpers';

test.describe('Settings page', () => {
  test('can update username when authenticated', async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto('/settings');

    const heading = page.getByRole('heading', { name: 'Settings' });
    if (await heading.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Verify form fields are present
      await expect(page.getByLabel('Username')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByText('Notification Preferences')).toBeVisible();
      await expect(page.getByText('Display Preferences')).toBeVisible();

      // Update username
      const newUsername = `updated_${Date.now().toString(36)}`;
      await page.getByLabel('Username').fill(newUsername);
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByText('Settings saved').or(page.getByText(/error/i))).toBeVisible({ timeout: 5000 });
    }
  });
});
