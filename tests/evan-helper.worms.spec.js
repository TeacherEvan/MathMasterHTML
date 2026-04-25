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

  test("Evan worm taps explode an active green worm", async ({ page }) => {
    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      window.wormSystem.spawnManager?.clearQueue?.();

      const worm = window.wormSystem._spawnWormWithConfig({
        logMessage: "test worm for Evan tap",
        position: { x: 240, y: 240 },
        wormIdPrefix: "evan-worm",
        classNames: [],
        baseSpeed: 0,
        roamDuration: 30000,
        fromConsole: false,
      });

      if (!worm) {
        throw new Error("Failed to create test worm");
      }

      worm.vx = 0;
      worm.vy = 0;
      worm.currentSpeed = 0;
      worm.baseSpeed = 0;
      worm.element.style.setProperty("--worm-x", "240px");
      worm.element.style.setProperty("--worm-y", "240px");

      window.__evanWormId = worm.id;
      window.EvanTargets.findGreenWormSegment = () =>
        worm.element.querySelector(".worm-segment");
      window.EvanTargets.findMuffinReward = () => null;
      window.EvanTargets.getNeededSymbol = () => null;
      window.EvanTargets.getNeededSymbols = () => [];
      window.EvanTargets.findFallingSymbol = () => null;
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => {
      const worm = window.wormSystem.worms.find(
        (entry) => entry.id === window.__evanWormId,
      );
      return !worm || worm.active === false;
    });

    expect(
      await page.evaluate(() => {
        const worm = window.wormSystem.worms.find(
          (entry) => entry.id === window.__evanWormId,
        );
        return worm ? worm.active : null;
      }),
    ).not.toBe(true);
  });

  test("Evan centers the hand on worm targets without leaving the target panel", async ({
    page,
  }) => {
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await page.evaluate(() => {
      window.__evanWormAlignment = { actions: 0 };

      const panel = document.getElementById("panel-b");
      if (!panel) {
        return;
      }

      const panelRect = panel.getBoundingClientRect();
      const target = document.createElement("button");
      target.dataset.testTarget = "worm-alignment";
      target.className = "worm-segment";
      target.getBoundingClientRect = () => ({
        x: panelRect.left + panelRect.width * 0.4,
        y: panelRect.bottom - 32,
        width: 24,
        height: 24,
        top: panelRect.bottom - 32,
        left: panelRect.left + panelRect.width * 0.4,
        right: panelRect.left + panelRect.width * 0.4 + 24,
        bottom: panelRect.bottom - 8,
        toJSON() {
          return this;
        },
      });
      document.body.appendChild(target);
      window.__evanWormAlignment.target = target;

      document.addEventListener(window.GameEvents.EVAN_ACTION_REQUESTED, (event) => {
        if (event.detail?.action === "wormTap") {
          window.__evanWormAlignment.actions += 1;
        }
      });

      window.EvanTargets.findGreenWormSegment = () => target;
      window.EvanTargets.findMuffinReward = () => null;
      window.EvanTargets.getNeededSymbol = () => null;
      window.EvanTargets.getNeededSymbols = () => [];
      window.EvanTargets.findFallingSymbol = () => null;
      window.EvanTargets.getBestPowerUp = () => null;
    });

    await page.waitForFunction(() => window.__evanWormAlignment.actions > 0, {
      timeout: 10000,
    });

    await page.waitForFunction(() => {
      const panel = document.getElementById("panel-b");
      const hand = document.getElementById("evan-hand");
      const target = window.__evanWormAlignment.target;
      if (!panel || !hand || !target) {
        return false;
      }

      const panelRect = panel.getBoundingClientRect();
      const handRect = hand.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const handCenterX = handRect.left + handRect.width / 2;
      const handCenterY = handRect.top + handRect.height / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      return (
        handCenterX >= panelRect.left &&
        handCenterX <= panelRect.right &&
        handCenterY >= panelRect.top &&
        handCenterY <= panelRect.bottom &&
        Math.abs(handCenterX - targetCenterX) <= 18 &&
        Math.abs(handCenterY - targetCenterY) <= 18
      );
    }, { timeout: 3000 });

    const result = await page.evaluate(() => {
      const panel = document.getElementById("panel-b");
      const hand = document.getElementById("evan-hand");
      const target = window.__evanWormAlignment.target;
      const panelRect = panel?.getBoundingClientRect?.() || null;
      const handRect = hand?.getBoundingClientRect?.() || null;
      const targetRect = target?.getBoundingClientRect?.() || null;
      const handCenterX = handRect ? handRect.left + handRect.width / 2 : null;
      const handCenterY = handRect ? handRect.top + handRect.height / 2 : null;

      return {
        handInsidePanel:
          Boolean(panelRect && handCenterX !== null && handCenterY !== null) &&
          handCenterX >= panelRect.left &&
          handCenterX <= panelRect.right &&
          handCenterY >= panelRect.top &&
          handCenterY <= panelRect.bottom,
        deltaX:
          handCenterX !== null && targetRect
            ? Math.abs(handCenterX - (targetRect.left + targetRect.width / 2))
            : null,
        deltaY:
          handCenterY !== null && targetRect
            ? Math.abs(handCenterY - (targetRect.top + targetRect.height / 2))
            : null,
      };
    });

    expect(result.handInsidePanel).toBe(true);
    expect(result.deltaX).not.toBeNull();
    expect(result.deltaY).not.toBeNull();
    expect(result.deltaX).toBeLessThanOrEqual(18);
    expect(result.deltaY).toBeLessThanOrEqual(18);
  });
});
