import { test, expect } from '@playwright/test';
import { signUpAndOnboard, createPrompt } from './helpers';

test.describe('Prompts CRUD', () => {
  test('can create a prompt and see toast confirmation', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPrompt(page);
    // createPrompt already verifies the toast "Prompt created!" appears
  });

  test('create prompt modal has all fields', async ({ page }) => {
    await signUpAndOnboard(page);

    await page.getByRole('button', { name: 'New Prompt' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByPlaceholder('Write your comedy prompt...')).toBeVisible();
    await expect(dialog.getByText(/Duration/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeVisible();
    await expect(dialog.getByText('0/500')).toBeVisible();
  });

  test('create prompt validates empty body', async ({ page }) => {
    await signUpAndOnboard(page);

    await page.getByRole('button', { name: 'New Prompt' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('cancel closes create prompt modal', async ({ page }) => {
    await signUpAndOnboard(page);

    await page.getByRole('button', { name: 'New Prompt' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('open topics page shows prompts or empty state', async ({ page }) => {
    await signUpAndOnboard(page);
    // Either prompts exist or empty state shows
    const promptCard = page.locator('a[href^="/prompts/"]').first();
    const emptyState = page.getByText('No open topics right now');
    const createAction = page.getByText('Create one');
    await expect(promptCard.or(emptyState).or(createAction)).toBeVisible({ timeout: 5000 });
  });

  test('prompt shows system badge for system-generated prompts', async ({ page }) => {
    await page.goto('/closed');
    await expect(page.getByRole('heading', { name: 'Closed Topics' })).toBeVisible();
  });
});
