import { type Page, expect } from '@playwright/test';

/**
 * Sign up a new user and complete onboarding.
 * Returns the username created.
 */
export async function signUpAndOnboard(page: Page, options?: { username?: string }): Promise<string> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const username = options?.username ?? `u_${Date.now().toString(36)}`;

  await page.goto('/closed');

  // Open sign-in modal and switch to sign-up
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Sign up' }).click();

  // Fill and submit
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('testpassword123');
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Complete onboarding
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  await page.getByPlaceholder('username').fill(username);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Should land on Open Topics
  await page.waitForURL('/', { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Open Topics' })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  return username;
}

/**
 * Create a prompt via the UI. Assumes user is logged in and on the Open Topics page.
 * Returns the prompt body text.
 */
export async function createPrompt(page: Page, body?: string): Promise<string> {
  const promptBody = body ?? `Test prompt ${Date.now()}`;

  await page.getByRole('button', { name: 'New Prompt' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByPlaceholder('Write your comedy prompt...').fill(promptBody);
  await page.getByRole('button', { name: 'Create' }).click();

  // Modal should close and toast should confirm
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Prompt created!')).toBeVisible({ timeout: 5000 });

  return promptBody;
}

/**
 * Create a prompt and navigate to its detail page.
 * Returns the prompt body text.
 */
export async function createPromptAndNavigate(page: Page, body?: string): Promise<string> {
  const promptBody = await createPrompt(page, body);

  // Find the prompt link on the page and click it
  // The prompt should be in the list — try clicking it, or use the first prompt link
  const promptLink = page.locator(`a[href^="/prompts/"]`, { hasText: promptBody });
  if (await promptLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await promptLink.click();
  } else {
    // If not visible on page 1, click the first available prompt
    await page.locator('a[href^="/prompts/"]').first().click();
  }

  await expect(page.getByPlaceholder('Write your pitch...')).toBeVisible({ timeout: 10000 });

  return promptBody;
}
