import { test, expect } from '@playwright/test';

test.describe('Cosmic Console - URL override and settings toggle', () => {
  test('default state has cosmic-console off', async ({ page }) => {
    await page.goto('/src/pages/index.html');
    await expect(page.locator('body')).not.toHaveClass(/cosmic-console/);
  });

  test('URL override ?cosmic=on enables cosmic-console', async ({ page }) => {
    await page.goto('/src/pages/index.html?cosmic=on');
    await expect(page.locator('body')).toHaveClass(/cosmic-console/);
    const signalColor = await page.evaluate(() => 
      getComputedStyle(document.body).getPropertyValue('--cosmic-signal')
    );
    expect(signalColor.trim().toLowerCase()).toBe('#5be3c9');
  });

  test('URL override ?cosmic=off disables cosmic-console', async ({ page }) => {
    await page.goto('/src/pages/index.html?cosmic=off');
    await expect(page.locator('body')).not.toHaveClass(/cosmic-console/);
  });

  test('Settings dialog toggle enables cosmic-console', async ({ page }) => {
    await page.goto('/src/pages/index.html');
    await page.click('#welcome-settings-button');
    await expect(page.locator('#welcome-settings-cosmic-console')).toBeVisible();
    await page.click('#welcome-settings-cosmic-console');
    await expect(page.locator('body')).toHaveClass(/cosmic-console/);
  });

  test('Settings dialog toggle disables cosmic-console', async ({ page }) => {
    await page.goto('/src/pages/index.html?cosmic=on');
    await page.click('#welcome-settings-button');
    await page.uncheck('#welcome-settings-cosmic-console');
    await expect(page.locator('body')).not.toHaveClass(/cosmic-console/);
  });
});