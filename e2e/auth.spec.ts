import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('visitor lands on /closed', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/closed/);
    await expect(page.getByRole('heading', { name: 'Closed Topics' })).toBeVisible();
  });

  test('sign in button is visible in header', async ({ page }) => {
    await page.goto('/closed');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('sign in modal shows all fields fully visible', async ({ page }) => {
    await page.goto('/closed');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // All form elements should be visible and not clipped
    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password');
    const submitButton = page.getByRole('button', { name: 'Sign In', exact: false }).last();
    const signUpLink = page.getByRole('button', { name: 'Sign up' });
    const cancelButton = page.getByRole('button', { name: 'Cancel' });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(signUpLink).toBeVisible();
    await expect(cancelButton).toBeVisible();

    // Verify email input is not clipped — check it's within viewport
    const emailBox = await emailInput.boundingBox();
    expect(emailBox).not.toBeNull();
    expect(emailBox!.y).toBeGreaterThanOrEqual(0);
  });

  test('can switch between sign in and sign up modes', async ({ page }) => {
    await page.goto('/closed');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Start in login mode
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // Switch to signup
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

    // Switch back
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });

  test('cancel closes the modal', async ({ page }) => {
    await page.goto('/closed');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByPlaceholder('Email')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByPlaceholder('Email')).not.toBeVisible();
  });

  test('signup with email/password works', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;

    await page.goto('/closed');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByRole('button', { name: 'Sign up' }).click();

    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill('testpassword123');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Should redirect to onboarding after signup
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
    await expect(page.getByText('Welcome to Writers Room')).toBeVisible();
  });

  test('onboarding sets username and redirects home', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const username = `user_${Date.now().toString(36)}`;

    // Sign up
    await page.goto('/closed');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill('testpassword123');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Onboarding
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
    await page.getByPlaceholder('username').fill(username);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should land on home (Open Topics)
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Open Topics' })).toBeVisible();
  });
});
