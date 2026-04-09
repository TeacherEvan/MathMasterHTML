// @ts-check
import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

test.describe("Worm rewards idempotency", () => {
  test.beforeEach(async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => window.wormSystem?.isInitialized === true);
    await page.evaluate(() => window.ScoreTimerManager?.pause?.());
  });

  test("duplicate wormExploded with same id awards purple bonus once", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const originalAdd = window.ScoreTimerManager.addBonusPoints.bind(window.ScoreTimerManager);
      const originalAward = window.wormSystem.awardPowerUps.bind(window.wormSystem);
      let purplePointAwards = 0;
      let purplePowerAwards = 0;

      window.ScoreTimerManager.addBonusPoints = (points, meta = {}) => {
        if (meta?.source === "purple-worm-kill") purplePointAwards += 1;
        return originalAdd(points, meta);
      };
      window.wormSystem.awardPowerUps = (count, source) => {
        if (source === "purple-worm-kill") purplePowerAwards += 1;
        return originalAward(count, source);
      };

      try {
        const detail = {
          wormId: "dup-purple-id",
          x: 300,
          y: 230,
          isRainKill: true,
          isChainReaction: false,
          wasPurple: true,
        };
        document.dispatchEvent(new CustomEvent("wormExploded", { detail }));
        document.dispatchEvent(new CustomEvent("wormExploded", { detail }));
        return {
          purplePointAwards,
          purplePowerAwards,
          muffins: document.querySelectorAll(".worm-muffin-reward").length,
        };
      } finally {
        window.ScoreTimerManager.addBonusPoints = originalAdd;
        window.wormSystem.awardPowerUps = originalAward;
      }
    });

    expect(result.purplePointAwards).toBe(1);
    expect(result.purplePowerAwards).toBe(1);
    expect(result.muffins).toBe(1);
  });

  test("purple non-rain kill never awards purple bonus", async ({ page }) => {
    const result = await page.evaluate(() => {
      const originalAdd = window.ScoreTimerManager.addBonusPoints.bind(window.ScoreTimerManager);
      const originalAward = window.wormSystem.awardPowerUps.bind(window.wormSystem);
      let purplePointAwards = 0;
      let purplePowerAwards = 0;

      window.ScoreTimerManager.addBonusPoints = (points, meta = {}) => {
        if (meta?.source === "purple-worm-kill") purplePointAwards += 1;
        return originalAdd(points, meta);
      };
      window.wormSystem.awardPowerUps = (count, source) => {
        if (source === "purple-worm-kill") purplePowerAwards += 1;
        return originalAward(count, source);
      };

      try {
        document.dispatchEvent(
          new CustomEvent("wormExploded", {
            detail: {
              wormId: "purple-direct-id",
              x: 320,
              y: 210,
              isRainKill: false,
              isChainReaction: false,
              wasPurple: true,
            },
          }),
        );
        return {
          purplePointAwards,
          purplePowerAwards,
          muffins: document.querySelectorAll(".worm-muffin-reward").length,
        };
      } finally {
        window.ScoreTimerManager.addBonusPoints = originalAdd;
        window.wormSystem.awardPowerUps = originalAward;
      }
    });

    expect(result.purplePointAwards).toBe(0);
    expect(result.purplePowerAwards).toBe(0);
    expect(result.muffins).toBe(1);
  });

  test("muffin pointerdown burst cannot award over 1 click", async ({ page }) => {
    const result = await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("wormExploded", {
          detail: {
            wormId: "muffin-cap-id",
            x: 260,
            y: 240,
            isRainKill: false,
            isChainReaction: false,
            wasPurple: false,
          },
        }),
      );

      const muffin = document.querySelector(".worm-muffin-reward");
      if (!muffin) {
        return { muffinClickAwards: -1, muffinPointsAwarded: -1, muffins: 0 };
      }

      const originalAdd = window.ScoreTimerManager.addBonusPoints.bind(window.ScoreTimerManager);
      let muffinClickAwards = 0;
      let muffinPointsAwarded = 0;
      window.ScoreTimerManager.addBonusPoints = (points, meta = {}) => {
        if (meta?.source === "muffin-click") {
          muffinClickAwards += 1;
          muffinPointsAwarded += Number(points) || 0;
        }
        return originalAdd(points, meta);
      };

      try {
        for (let i = 0; i < 10; i++) {
          muffin.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              pointerType: "mouse",
            }),
          );
        }
        return {
          muffinClickAwards,
          muffinPointsAwarded,
        };
      } finally {
        window.ScoreTimerManager.addBonusPoints = originalAdd;
      }
    });

    expect(result.muffinClickAwards).toBe(1);
    expect(result.muffinPointsAwarded).toBe(1000);
    await expect(page.locator(".worm-muffin-reward")).toHaveCount(0);
  });
});
