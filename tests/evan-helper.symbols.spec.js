// tests/evan-helper.symbols.spec.js
import { expect, test } from "@playwright/test";
import { installRectTarget } from "./utils/evan-target-fixtures.js";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

test.setTimeout(60000);

test.describe("Evan Symbol Behavior — Build 5", () => {
  test.beforeEach(async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
    await page.waitForSelector("#start-game-btn", {
      state: "visible",
      timeout: 10000,
    });
  });

  test("SYMBOL_CLICKED events dispatched with correct symbol values", async ({
    page,
  }) => {
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__symbolClicks = [];
      const symbolTarget = document.querySelector('[data-test-target="symbol"]');
      document.addEventListener(window.GameEvents.SYMBOL_CLICKED, (e) => {
        window.__symbolClicks.push(e.detail?.symbol);
      });
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.getNeededSymbols = () => ["x"];
      window.EvanTargets.findFallingSymbol = () => symbolTarget;
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => window.__symbolClicks?.length > 0, {
      timeout: 30000,
    });

    const clicks = await page.evaluate(() => window.__symbolClicks);
    expect(clicks.length).toBeGreaterThan(0);
    for (const sym of clicks) {
      expect(typeof sym).toBe("string");
      expect(sym.length).toBeGreaterThan(0);
    }
  });

  test("#evan-hand moves during action", async ({ page }) => {
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(
      () => document.body.classList.contains("evan-help-active"),
      { timeout: 10000 },
    );

    const moved = await page.waitForFunction(
      () => {
        const hand = document.getElementById("evan-hand");
        if (!hand) return false;
        const transform = hand.style.transform || "";
        return transform && !transform.includes("-200px, -200px");
      },
      { timeout: 20000 },
    );
    expect(moved).toBeTruthy();
  });

  test("after PROBLEM_COMPLETED, no further SYMBOL_CLICKED events", async ({
    page,
  }) => {
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__postCompleteClicks = 0;
      window.__symbolClicksBeforeComplete = 0;
      window.__problemDone = false;
      const symbolTarget = document.querySelector('[data-test-target="symbol"]');
      document.addEventListener(window.GameEvents.PROBLEM_COMPLETED, () => {
        window.__problemDone = true;
      });
      document.addEventListener(window.GameEvents.SYMBOL_CLICKED, () => {
        if (window.__problemDone) {
          window.__postCompleteClicks++;
        } else {
          window.__symbolClicksBeforeComplete++;
        }
      });
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.getNeededSymbols = () => ["x"];
      window.EvanTargets.findFallingSymbol = () => symbolTarget;
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => window.__symbolClicksBeforeComplete > 0, {
      timeout: 30000,
    });
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PROBLEM_COMPLETED));
    });

    await page.waitForTimeout(1000);
    const postClicks = await page.evaluate(() => window.__postCompleteClicks);
    expect(postClicks).toBe(0);
  });

  test("after EVAN_HELP_STOPPED, no further SYMBOL_CLICKED events", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.__postStopClicks = 0;
      window.__evanStopped = false;
      document.addEventListener(window.GameEvents.EVAN_HELP_STOPPED, () => {
        window.__evanStopped = true;
      });
      document.addEventListener(window.GameEvents.SYMBOL_CLICKED, () => {
        if (window.__evanStopped) window.__postStopClicks++;
      });
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(
      () => document.body.classList.contains("evan-help-active"),
      { timeout: 10000 },
    );
    await page.waitForFunction(
      () => {
        const btn = document.getElementById("evan-skip-button");
        return btn && !btn.hidden;
      },
      { timeout: 5000 },
    );
    await page.click("#evan-skip-button");

    await page.waitForTimeout(1000);
    const postClicks = await page.evaluate(() => window.__postStopClicks);
    expect(postClicks).toBe(0);
  });

  test("zero-area target does not freeze Evan; solving continues", async ({
    page,
  }) => {
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__symbolClicks = [];
      const symbolTarget = document.querySelector('[data-test-target="symbol"]');
      document.addEventListener(window.GameEvents.SYMBOL_CLICKED, (e) => {
        window.__symbolClicks.push(e.detail?.symbol);
      });

      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.getNeededSymbols = () => ["x"];
      let injected = false;
      window.EvanTargets.findFallingSymbol = () => {
        if (!injected) {
          injected = true;
          const fake = document.createElement("div");
          fake.className = "falling-symbol";
          fake.textContent = "x";
          fake.getBoundingClientRect = () => ({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            toJSON() {
              return this;
            },
          });
          document.body.appendChild(fake);
          setTimeout(() => {
            fake.remove();
          }, 50);
          return fake;
        }
        return symbolTarget;
      };
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => window.__symbolClicks?.length > 0, {
      timeout: 30000,
    });

    expect(await page.evaluate(() => window.__symbolClicks.length)).toBeGreaterThan(
      0,
    );
  });

  test("off-window falling symbols are ignored as Evan targets", async ({
    page,
  }) => {
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const result = await page.evaluate(() => {
      const panel = document.getElementById("panel-c");
      if (!panel) {
        return null;
      }

      const fake = document.createElement("div");
      fake.className = "falling-symbol";
      fake.textContent = "⊕";
      fake.getBoundingClientRect = () => ({
        x: 0,
        y: -60,
        width: 48,
        height: 48,
        top: -60,
        left: 0,
        right: 48,
        bottom: -12,
        toJSON() {
          return this;
        },
      });
      panel.appendChild(fake);

      const target = window.EvanTargets.findBestFallingSymbol(["⊕"]);
      const chosenText = target?.textContent || null;

      fake.remove();

      return {
        chosenText,
      };
    });

    expect(result).not.toBeNull();
    expect(result.chosenText).toBeNull();
  });
});
