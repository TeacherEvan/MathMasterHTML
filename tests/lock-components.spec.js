// tests/lock-components.spec.js - E2E checks for lock component loading
import { expect, test } from "@playwright/test";

test.describe("Lock Component Styles", () => {
  test("Line 3 lock loads split styles and activates", async ({ page }) => {
    await page.goto(
      "/src/assets/components/lock-components/line-3-transformer.html",
    );

    const baseLink = page.locator(
      'link[href="/src/styles/css/lock-components/line-3-transformer.css"]',
    );
    const effectsLink = page.locator(
      'link[href="/src/styles/css/lock-components/line-3-transformer.effects.css"]',
    );

    await expect(baseLink).toHaveCount(1);
    await expect(effectsLink).toHaveCount(1);

    await page.evaluate(() => {
      if (window.Level3Lock) {
        window.Level3Lock.activate();
      }
    });

    const lockBody = page.locator("#lockBody");
    await expect(lockBody).toHaveClass(/level-3-active/);
  });

  test("Line 6 lock loads split styles and activates core phases", async ({
    page,
  }) => {
    test.setTimeout(20000);

    await page.goto(
      "/src/assets/components/lock-components/line-6-transformer.html",
    );

    const baseLink = page.locator(
      'link[href="/src/styles/css/lock-components/line-6-transformer.css"]',
    );
    const effectsLink = page.locator(
      'link[href="/src/styles/css/lock-components/line-6-transformer.effects.css"]',
    );

    await expect(baseLink).toHaveCount(1);
    await expect(effectsLink).toHaveCount(1);

    await page.evaluate(() => {
      if (window.Level6Lock) {
        window.Level6Lock.activate();
      }
    });

    const cosmicBackground = page.locator("#cosmicBackground");
    await expect(cosmicBackground).toHaveClass(/active/, { timeout: 3000 });

    const lockBody = page.locator("#lockBody");
    await expect(lockBody).toHaveClass(/active/, { timeout: 6000 });
  });
});
