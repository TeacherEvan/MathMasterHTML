import { test } from "@playwright/test";
import {
  gotoEvanGame,
  installRectTarget,
} from "./utils/evan-target-fixtures.js";

test.setTimeout(60000);

test.describe("Evan Power-Up Activation — Build 7", () => {
  test.beforeEach(async ({ page }) => {
    await gotoEvanGame(page, "?level=warrior&evan=force&preload=off");
  });

  test("successful power-up activation resumes symbol solving", async ({
    page,
  }) => {
    await installRectTarget(page, "worm");
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__actions = [];
      window.GameSymbolHandlerCore = window.GameSymbolHandlerCore || {};
      let allowPowerUp = true;
      const worm = document.querySelector('[data-test-target="worm"]');
      const symbol = document.querySelector('[data-test-target="symbol"]');
      document.addEventListener(
        window.GameEvents.EVAN_ACTION_COMPLETED,
        (e) => {
          window.__actions.push(e.detail?.action);
        },
      );
      document.addEventListener(
        "pointerdown",
        () => {
          if (!allowPowerUp) return;
          allowPowerUp = false;
          document.dispatchEvent(new CustomEvent("powerUpActivated"));
        },
        { once: true },
      );
      window.wormSystem = {
        powerUpSystem: {
          inventory: { chainLightning: 1, spider: 0, devil: 0 },
          isPlacementMode: false,
          selectPowerUp() {
            this.isPlacementMode = true;
          },
          deselectPowerUp() {
            this.isPlacementMode = false;
          },
        },
      };
      window.EvanTargets.findGreenWormSegment = () =>
        allowPowerUp ? worm : null;
      window.EvanTargets.getBestPowerUp = () =>
        allowPowerUp ? "chainLightning" : null;
      window.EvanTargets.isVisible = () => true;
      window.EvanTargets.getNeededSymbols = () => ["x"];
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.findBestFallingSymbol = () => symbol;
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.EVAN_HELP_STARTED, {
          detail: { mode: "manual", level: "warrior" },
        }),
      );
    });
    await page.waitForFunction(
      () =>
        window.__actions?.includes("powerUp") &&
        window.__actions?.includes("symbolClick"),
      { timeout: 5000 },
    );
  });

  test("invalid placement target does not freeze symbol solving", async ({
    page,
  }) => {
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__actions = [];
      window.GameSymbolHandlerCore = window.GameSymbolHandlerCore || {};
      const symbol = document.querySelector('[data-test-target="symbol"]');
      const zeroRectTarget = document.createElement("button");
      zeroRectTarget.getBoundingClientRect = () => ({
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
      document.body.appendChild(zeroRectTarget);
      document.addEventListener(
        window.GameEvents.EVAN_ACTION_COMPLETED,
        (e) => {
          window.__actions.push(e.detail?.action);
        },
      );
      window.wormSystem = {
        powerUpSystem: {
          inventory: { chainLightning: 1, spider: 0, devil: 0 },
          isPlacementMode: false,
          selectPowerUp() {
            this.isPlacementMode = true;
          },
          deselectPowerUp() {
            this.isPlacementMode = false;
          },
        },
      };
      window.EvanTargets.findGreenWormSegment = () => zeroRectTarget;
      window.EvanTargets.getBestPowerUp = () => null;
      window.EvanTargets.isVisible = (target) => target !== zeroRectTarget;
      window.EvanTargets.getNeededSymbols = () => ["x"];
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.findBestFallingSymbol = () => symbol;
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.EVAN_HELP_STARTED, {
          detail: { mode: "manual", level: "warrior" },
        }),
      );
    });
    await page.waitForFunction(
      () => window.__actions?.includes("symbolClick"),
      {
        timeout: 5000,
      },
    );
  });
});
