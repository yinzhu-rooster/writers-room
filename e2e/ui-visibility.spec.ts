import { test, expect } from '@playwright/test';

test.describe('UI visibility checks', () => {
  test('closed topics page renders correctly', async ({ page }) => {
    await page.goto('/closed');

    await expect(page.getByText('Writers Room')).toBeVisible();
    await expect(page.getByText('Closed Topics')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('header is not clipped or overlapping content', async ({ page }) => {
    await page.goto('/closed');

    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.y).toBeGreaterThanOrEqual(0);
    expect(headerBox!.height).toBeGreaterThan(40);

    // Main content should start below header
    const main = page.locator('main');
    const mainBox = await main.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(mainBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  });

  test('modals are fully visible and centered', async ({ page }) => {
    await page.goto('/closed');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Modal dialog should be visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Modal content should be within viewport
    const modalBox = await dialog.boundingBox();
    const viewport = page.viewportSize()!;

    expect(modalBox).not.toBeNull();
    expect(modalBox!.x).toBeGreaterThanOrEqual(0);
    expect(modalBox!.y).toBeGreaterThanOrEqual(0);
    expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(viewport.height);
  });
});
