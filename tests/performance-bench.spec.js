// @ts-check
import { expect, test } from "@playwright/test";

test.describe("Performance benchmarks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner");

    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });
    await page.waitForTimeout(600);
  });

  test("maintains acceptable FPS and memory usage", async ({ page }) => {
    await page.keyboard.press("P");
    await page.waitForTimeout(1200);

    const fpsText = await page.locator("#perf-fps").textContent();
    const fps = Number(fpsText);

    expect(Number.isFinite(fps)).toBeTruthy();
    expect(fps).toBeGreaterThanOrEqual(30);

    const memory = await page.evaluate(() => {
      const perf = window.performance;
      if (!perf || !perf.memory) return null;
      return perf.memory.usedJSHeapSize;
    });

    if (memory !== null) {
      expect(memory).toBeGreaterThan(0);
      expect(memory).toBeLessThan(600 * 1024 * 1024);
    }
  });
});
