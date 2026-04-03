import { test, expect } from '@playwright/test';
import { signUpAndOnboard, createPromptAndNavigate } from './helpers';

test.describe('Pitches', () => {
  test('can submit a pitch on an open prompt', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPromptAndNavigate(page);

    // Submit a pitch
    const pitchBody = `My funny pitch ${Date.now()}`;
    await page.getByPlaceholder('Write your pitch...').fill(pitchBody);
    await page.getByRole('button', { name: 'Submit' }).click();

    // Pitch should appear with "You" badge
    await expect(page.getByText(pitchBody)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pitch submitted!')).toBeVisible({ timeout: 5000 });
  });

  test('pitch input shows character counter', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPromptAndNavigate(page);

    await expect(page.getByText('0/1000')).toBeVisible();
    await page.getByPlaceholder('Write your pitch...').fill('Hello');
    await expect(page.getByText('5/1000')).toBeVisible();
  });

  test('submit button disabled when pitch is empty', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPromptAndNavigate(page);

    await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  test('own pitch shows actions menu', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPromptAndNavigate(page);

    const pitchBody = `Pitch for actions ${Date.now()}`;
    await page.getByPlaceholder('Write your pitch...').fill(pitchBody);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(pitchBody)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Pitch actions' }).click();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('can edit a pitch within edit window', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPromptAndNavigate(page);

    const originalBody = `Original pitch ${Date.now()}`;
    await page.getByPlaceholder('Write your pitch...').fill(originalBody);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(originalBody)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Pitch actions' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const editedBody = `Edited pitch ${Date.now()}`;
    await dialog.getByRole('textbox').fill(editedBody);
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(editedBody)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('(edited)').first()).toBeVisible();
  });

  test('can delete a pitch', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPromptAndNavigate(page);

    const pitchBody = `To delete ${Date.now()}`;
    await page.getByPlaceholder('Write your pitch...').fill(pitchBody);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(pitchBody)).toBeVisible({ timeout: 10000 });

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Pitch actions' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(pitchBody)).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pitch deleted')).toBeVisible({ timeout: 5000 });
  });

  test('no reaction buttons on own pitch', async ({ page }) => {
    await signUpAndOnboard(page);
    await createPromptAndNavigate(page);

    await page.getByPlaceholder('Write your pitch...').fill('My own pitch');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('My own pitch')).toBeVisible({ timeout: 10000 });

    // The pitch card for "My own pitch" should not have reaction buttons
    const ownPitchCard = page.locator('div', { hasText: 'My own pitch' }).filter({ hasText: 'You' });
    await expect(ownPitchCard.getByRole('group', { name: 'Reactions' })).not.toBeVisible();
  });
});
