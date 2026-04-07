// tests/evan-helper.powerups.spec.js
import { expect, test } from "@playwright/test";

test.setTimeout(60000);

async function installRectTarget(page, name, text = "") {
  await page.evaluate(
    ({ targetName, textContent }) => {
      const target = document.createElement("button");
      target.dataset.testTarget = targetName;
      target.textContent = textContent;
      target.getBoundingClientRect = () => ({
        x: 120,
        y: 160,
        width: 48,
        height: 48,
        top: 160,
        left: 120,
        right: 168,
        bottom: 208,
        toJSON() {
          return this;
        },
      });
      document.body.appendChild(target);
    },
    { targetName: name, textContent: text },
  );
}

test.describe("Evan Power-Up Behavior — Build 7", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `/src/pages/game.html?level=warrior&evan=force&preload=off&case=${Date.now()}`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForSelector("#start-game-btn", {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForTimeout(200);
  });

  test("Evan uses selectPowerUp when inventory > 0 and target exists", async ({
    page,
  }) => {
    await installRectTarget(page, "worm");
    await page.evaluate(() => {
      window.__selectedPowerUps = [];
      const worm = document.querySelector('[data-test-target="worm"]');
      const activatePowerUp = (event) => {
        if (event.clientX === 144 && event.clientY === 184) {
          document.removeEventListener("pointerdown", activatePowerUp);
          document.dispatchEvent(new CustomEvent("powerUpActivated"));
        }
      };
      document.addEventListener("pointerdown", activatePowerUp);

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

    await page.click("#start-game-btn");
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
      const worm = document.querySelector('[data-test-target="worm"]');
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

    await page.click("#start-game-btn");
    await page.waitForTimeout(1000);

    expect(await page.evaluate(() => window.__selectCalls)).toBe(0);
  });

  test("timeout triggers deselectPowerUp if powerUpActivated not fired", async ({
    page,
  }) => {
    await installRectTarget(page, "worm");
    await page.evaluate(() => {
      window.__deselectCalls = 0;
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

    await page.click("#start-game-btn");
    await page.waitForFunction(() => window.__deselectCalls > 0, {
      timeout: 5000,
    });

    expect(await page.evaluate(() => window.__deselectCalls)).toBeGreaterThan(
      0,
    );
  });

  test("Evan resumes solving after power-up activation", async ({ page }) => {
    await installRectTarget(page, "worm");
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__actions = [];
      let allowPowerUp = true;
      const worm = document.querySelector('[data-test-target="worm"]');
      const symbol = document.querySelector('[data-test-target="symbol"]');
      document.addEventListener(
        window.GameEvents.EVAN_ACTION_REQUESTED,
        (e) => {
          window.__actions.push(e.detail?.action);
        },
      );
      const activatePowerUp = (event) => {
        if (event.clientX === 144 && event.clientY === 184) {
          document.removeEventListener("pointerdown", activatePowerUp);
          allowPowerUp = false;
          document.dispatchEvent(new CustomEvent("powerUpActivated"));
        }
      };
      document.addEventListener("pointerdown", activatePowerUp);

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
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await page.click("#start-game-btn");
    await page.waitForFunction(
      () =>
        window.__actions?.includes("powerUp") &&
        window.__actions?.includes("symbolClick"),
      { timeout: 8000 },
    );

    const actions = await page.evaluate(() => window.__actions);
    expect(actions.indexOf("powerUp")).toBeLessThan(
      actions.indexOf("symbolClick"),
    );
  });

  test("invalid placement target does not freeze Evan", async ({ page }) => {
    await installRectTarget(page, "visible-worm");
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      window.__actions = [];
      let greenCalls = 0;
      const visibleWorm = document.querySelector(
        '[data-test-target="visible-worm"]',
      );
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
        window.GameEvents.EVAN_ACTION_REQUESTED,
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
      window.EvanTargets.findGreenWormSegment = () => {
        greenCalls++;
        if (greenCalls === 1) return visibleWorm;
        if (greenCalls === 2) return zeroRectTarget;
        return null;
      };
      window.EvanTargets.getBestPowerUp = () =>
        greenCalls < 3 ? "chainLightning" : null;
      window.EvanTargets.isVisible = (target) =>
        target !== zeroRectTarget && target?.isConnected === true;
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await page.click("#start-game-btn");
    await page.waitForFunction(
      () => window.__actions?.includes("symbolClick"),
      {
        timeout: 8000,
      },
    );

    expect(await page.evaluate(() => window.__actions)).toContain(
      "symbolClick",
    );
  });
});
