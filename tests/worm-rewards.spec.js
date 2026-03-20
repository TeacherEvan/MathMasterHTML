// @ts-check
import { expect, test } from "@playwright/test";

test.describe("Worm rewards", () => {
  const readScore = () =>
    Number.parseInt(document.getElementById("score-value")?.textContent || "0", 10) || 0;

  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner", { waitUntil: "domcontentloaded" });
    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });
    await page.waitForFunction(() => window.wormSystem?.isInitialized === true);
    await page.evaluate(() => window.ScoreTimerManager?.pause?.());
  });

  test("muffin gives 1000 per click and resolves at 4 clicks", async ({ page }) => {
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("wormExploded", {
          detail: {
            wormId: "test-worm",
            x: 240,
            y: 240,
            isRainKill: false,
            isChainReaction: false,
            wasPurple: false,
          },
        }),
      );
    });

    const muffin = page.locator(".worm-muffin-reward");
    await expect(muffin).toBeVisible();

    const before = await page.evaluate(readScore);
    await muffin.dispatchEvent("pointerdown");
    await muffin.dispatchEvent("pointerdown");
    await muffin.dispatchEvent("pointerdown");
    await muffin.dispatchEvent("pointerdown");

    await expect(page.locator(".worm-muffin-reward")).toHaveCount(0);
    await expect(page.locator(".muffin-shoutout")).toBeVisible();
    await expect
      .poll(() => page.evaluate(readScore), { timeout: 10000 })
      .toBeGreaterThanOrEqual(before + 4000);
  });

  test("purple rain kill grants 50000, 2 powerups, and muffin spawn", async ({
    page,
  }) => {
    const before = await page.evaluate(() => ({
      score:
        Number.parseInt(document.getElementById("score-value")?.textContent || "0", 10) || 0,
      powerUps: { ...window.wormSystem.powerUps },
    }));

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("wormExploded", {
          detail: {
            wormId: "test-purple",
            x: 320,
            y: 220,
            isRainKill: true,
            isChainReaction: false,
            wasPurple: true,
          },
        }),
      );
    });

    await expect(page.locator(".worm-muffin-reward")).toBeVisible();
    await expect(page.locator(".muffin-shoutout")).toBeVisible();

    const beforeTotal =
      before.powerUps.chainLightning + before.powerUps.spider + before.powerUps.devil;
    await expect
      .poll(
        () =>
          page.evaluate(() => ({
            score:
              Number.parseInt(document.getElementById("score-value")?.textContent || "0", 10) ||
              0,
            powerUps: { ...window.wormSystem.powerUps },
          })),
        { timeout: 10000 },
      )
      .toMatchObject({
        score: before.score + 50000,
        powerUps: expect.objectContaining({
          chainLightning: expect.any(Number),
          spider: expect.any(Number),
          devil: expect.any(Number),
        }),
      });
    const afterTotal = await page.evaluate(() => {
      const p = window.wormSystem.powerUps;
      return p.chainLightning + p.spider + p.devil;
    });
    expect(afterTotal).toBe(beforeTotal + 2);
  });
});
