// tests/evan-helper.worms.spec.js
import { expect, test } from "@playwright/test";
import { installRectTarget } from "./utils/evan-target-fixtures.js";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

test.setTimeout(60000);

test.describe("Evan Worm + Reward Behavior — Build 6", () => {
  test.beforeEach(async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
    await page.waitForSelector("#start-game-btn", {
      state: "visible",
      timeout: 10000,
    });
  });

  test("Evan targets green worm segments before symbols when present", async ({
    page,
  }) => {
    await installRectTarget(page, "worm-segment");
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__actions = [];
      let wormServed = false;
      const worm = document.querySelector('[data-test-target="worm-segment"]');
      const symbol = document.querySelector('[data-test-target="symbol"]');
      document.addEventListener(
        window.GameEvents.EVAN_ACTION_REQUESTED,
        (e) => {
          window.__actions.push(e.detail?.action);
        },
      );
      window.EvanTargets.findGreenWormSegment = () => {
        if (!wormServed) {
          wormServed = true;
          return worm;
        }
        return null;
      };
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => window.__actions?.length >= 2, {
      timeout: 10000,
    });
    const actions = await page.evaluate(() => window.__actions);
    expect(actions[0]).toBe("wormTap");
    expect(actions).toContain("symbolClick");
  });

  test("Evan clicks muffin rewards until removed", async ({ page }) => {
    await installRectTarget(page, "muffin");
    await page.evaluate(() => {
      const muffin = document.querySelector('[data-test-target="muffin"]');
      window.__muffinClicks = 0;
      muffin.addEventListener("pointerdown", () => {
        window.__muffinClicks++;
        if (window.__muffinClicks >= 3) muffin.remove();
      });
      window.EvanTargets.findGreenWormSegment = () => null;
      window.EvanTargets.findMuffinReward = () =>
        document.querySelector('[data-test-target="muffin"]');
      window.EvanTargets.getNeededSymbol = () => null;
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => window.__muffinClicks >= 3, {
      timeout: 5000,
    });
    expect(
      await page.evaluate(() => window.__muffinClicks),
    ).toBeGreaterThanOrEqual(3);
    expect(
      await page.evaluate(
        () => document.querySelector('[data-test-target="muffin"]') === null,
      ),
    ).toBe(true);
  });

  test("Evan re-evaluates cleanly if worm target disappears before click completes", async ({
    page,
  }) => {
    await installRectTarget(page, "worm-gone");
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__actions = [];
      let wormCalls = 0;
      const symbol = document.querySelector('[data-test-target="symbol"]');
      document.addEventListener(
        window.GameEvents.EVAN_ACTION_COMPLETED,
        (e) => {
          window.__actions.push(e.detail?.action);
        },
      );
      window.EvanTargets.findGreenWormSegment = () => {
        wormCalls++;
        if (wormCalls === 1) {
          const worm = document.querySelector('[data-test-target="worm-gone"]');
          if (worm) setTimeout(() => worm.remove(), 50);
          return worm;
        }
        return null;
      };
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.getNeededSymbols = () => ["x"];
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(
      () => window.__actions?.includes("symbolClick"),
      { timeout: 10000 },
    );
    expect(await page.evaluate(() => window.__actions)).toContain(
      "symbolClick",
    );
  });

  test("Evan resumes symbol solving after worm/reward targets cleared", async ({
    page,
  }) => {
    await installRectTarget(page, "worm-segment");
    await installRectTarget(page, "muffin");
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__actions = [];
      const worm = document.querySelector('[data-test-target="worm-segment"]');
      const muffin = document.querySelector('[data-test-target="muffin"]');
      const symbol = document.querySelector('[data-test-target="symbol"]');
      let wormServed = false;
      let muffinClicks = 0;
      document.addEventListener(
        window.GameEvents.EVAN_ACTION_COMPLETED,
        (e) => {
          window.__actions.push(e.detail?.action);
        },
      );
      muffin.addEventListener("pointerdown", () => {
        muffinClicks++;
        if (muffinClicks >= 2) muffin.remove();
      });
      window.EvanTargets.findGreenWormSegment = () => {
        if (!wormServed) {
          wormServed = true;
          return worm;
        }
        return null;
      };
      window.EvanTargets.findMuffinReward = () => {
        const reward = document.querySelector('[data-test-target="muffin"]');
        if (reward) {
          setTimeout(() => reward.remove(), 50);
        }
        return reward;
      };
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.getNeededSymbols = () => ["x"];
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(
      () => window.__actions?.includes("symbolClick"),
      { timeout: 12000 },
    );
    const actions = await page.evaluate(() => window.__actions);
    expect(actions).toContain("wormTap");
    expect(actions).toContain("symbolClick");
  });
});
