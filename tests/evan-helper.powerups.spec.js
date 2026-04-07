// tests/evan-helper.powerups.spec.js
import { expect, test } from "@playwright/test";
import {
  gotoEvanGame,
  installRectTarget,
} from "./utils/evan-target-fixtures.js";

test.setTimeout(60000);

async function startEvanController(page) {
  await page.click("#start-game-btn");
  await page.waitForFunction(
    () =>
      window.GameEvents &&
      window.GameSymbolHandlerCore &&
      window.EvanTargets &&
      document.body.classList.contains("evan-help-active"),
    { timeout: 10000 },
  );
}

test.describe("Evan Power-Up Behavior — Build 7", () => {
  test.beforeEach(async ({ page }) => {
    await gotoEvanGame(page, "?level=warrior&evan=force&preload=off");
  });

  test("Evan uses selectPowerUp when inventory > 0 and target exists", async ({
    page,
  }) => {
    await installRectTarget(page, "worm");
    await page.evaluate(() => {
      window.__selectedPowerUps = [];
      window.GameSymbolHandlerCore = window.GameSymbolHandlerCore || {};
      const worm = document.querySelector('[data-test-target="worm"]');
      document.addEventListener(
        "pointerdown",
        () => {
          document.dispatchEvent(new CustomEvent("powerUpActivated"));
        },
        { once: true },
      );
      window.wormSystem = {
        powerUpSystem: {
          inventory: { chainLightning: 1, spider: 0, devil: 0 },
          isPlacementMode: false,
          selectPowerUp(type) {
            this.isPlacementMode = true;
            window.__selectedPowerUps.push(type);
          },
          deselectPowerUp() {
            this.isPlacementMode = false;
          },
        },
      };
      window.EvanTargets.findGreenWormSegment = () => worm;
      window.EvanTargets.getBestPowerUp = () => "chainLightning";
      window.EvanTargets.isVisible = () => true;
      window.EvanTargets.getNeededSymbol = () => null;
    });

    await startEvanController(page);
    await page.waitForFunction(() => window.__selectedPowerUps?.length > 0, {
      timeout: 5000,
    });
    expect(await page.evaluate(() => window.__selectedPowerUps[0])).toBe(
      "chainLightning",
    );
  });

  test("Evan does not use power-ups when inventory is 0", async ({ page }) => {
    await installRectTarget(page, "worm");
    await page.evaluate(() => {
      window.__selectCalls = 0;
      window.__actions = [];
      window.GameSymbolHandlerCore = window.GameSymbolHandlerCore || {};
      const worm = document.querySelector('[data-test-target="worm"]');
      document.addEventListener(window.GameEvents.EVAN_ACTION_COMPLETED, (e) => {
        window.__actions.push(e.detail?.action);
      });
      window.wormSystem = {
        powerUpSystem: {
          inventory: { chainLightning: 0, spider: 0, devil: 0 },
          isPlacementMode: false,
          selectPowerUp() {
            window.__selectCalls++;
          },
          deselectPowerUp() {},
        },
      };
      window.EvanTargets.findGreenWormSegment = () => worm;
      window.EvanTargets.getBestPowerUp = () => null;
      window.EvanTargets.isVisible = () => true;
      window.EvanTargets.getNeededSymbol = () => null;
    });

    await startEvanController(page);
    await page.waitForFunction(
      () => window.__actions?.includes("wormTap"),
      { timeout: 5000 },
    );
    expect(await page.evaluate(() => window.__selectCalls)).toBe(0);
  });

  test("timeout triggers deselectPowerUp if powerUpActivated not fired", async ({
    page,
  }) => {
    await installRectTarget(page, "worm");
    await page.evaluate(() => {
      window.__deselectCalls = 0;
      window.GameSymbolHandlerCore = window.GameSymbolHandlerCore || {};
      const worm = document.querySelector('[data-test-target="worm"]');
      window.wormSystem = {
        powerUpSystem: {
          inventory: { chainLightning: 1, spider: 0, devil: 0 },
          isPlacementMode: false,
          selectPowerUp() {
            this.isPlacementMode = true;
          },
          deselectPowerUp() {
            window.__deselectCalls++;
            this.isPlacementMode = false;
          },
        },
      };
      window.EvanTargets.findGreenWormSegment = () => worm;
      window.EvanTargets.getBestPowerUp = () => "chainLightning";
      window.EvanTargets.isVisible = () => true;
      window.EvanTargets.getNeededSymbol = () => null;
    });

    await startEvanController(page);
    await page.waitForFunction(() => window.__deselectCalls > 0, {
      timeout: 5000,
    });
    expect(await page.evaluate(() => window.__deselectCalls)).toBeGreaterThan(
      0,
    );
  });
});
