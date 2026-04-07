// tests/evan-helper.ui.spec.js - Evan Helper UI Coverage (Build 3)
import { expect, test } from "@playwright/test";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

test.setTimeout(30000);

const BASE_URL = "http://localhost:8000";

async function dismissBriefing(page) {
  await page.waitForSelector("#start-game-btn", {
    state: "visible",
    timeout: 10000,
  });
  await page.click("#start-game-btn");
  await page.waitForFunction(
    () => {
      const modal = document.getElementById("how-to-play-modal");
      return !modal || window.getComputedStyle(modal).display === "none";
    },
    { timeout: 10000 },
  );
}

async function ensurePowerUpDisplay(page) {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        return Boolean(
          window.wormSystem?.powerUpSystem &&
          typeof window.wormSystem.powerUpSystem.updateDisplay === "function",
        );
      });
    })
    .toBe(true);

  const displayCreated = await page.evaluate(() => {
    const powerUpSystem = window.wormSystem?.powerUpSystem;
    if (!powerUpSystem?.inventory) {
      return false;
    }

    powerUpSystem.inventory.chainLightning = 1;
    powerUpSystem.updateDisplay();
    return true;
  });

  expect(displayCreated).toBe(true);
  await expect(page.locator("#power-up-display")).toBeVisible();
}

test.describe("Evan Helper — UI Elements (Build 3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/game.html?level=beginner`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await dismissBriefing(page);
  });

  test("#evan-assist-shell renders without obscuring #power-up-display", async ({
    page,
  }) => {
    await ensurePowerUpDisplay(page);

    // Show Evan shell
    await page.evaluate(() => {
      window.EvanPresenter?.show();
    });

    await expect(page.locator("#evan-assist-shell")).toBeVisible();

    const powerUpBox = await page.locator("#power-up-display").boundingBox();
    expect(powerUpBox).toBeTruthy();
    expect(powerUpBox.width).toBeGreaterThan(0);
    expect(powerUpBox.height).toBeGreaterThan(0);

    const powerUpOpacity = await page.evaluate(() => {
      const display = document.getElementById("power-up-display");
      if (!display) return 0;
      return parseFloat(window.getComputedStyle(display).opacity);
    });

    expect(powerUpOpacity).toBeGreaterThan(0);
  });

  test("body.evan-layout-preview does not cause #power-up-display to have zero visible area", async ({
    page,
  }) => {
    await ensurePowerUpDisplay(page);

    await page.evaluate(() => {
      document.body.classList.add("evan-layout-preview");
    });

    const powerUpBox = await page.locator("#power-up-display").boundingBox();
    expect(powerUpBox).toBeTruthy();
    expect(powerUpBox.width).toBeGreaterThan(0);
    expect(powerUpBox.height).toBeGreaterThan(0);

    const visibleArea = powerUpBox.width * powerUpBox.height;
    expect(visibleArea).toBeGreaterThan(0);
  });

  test("Reduced-motion: Evan shell transitions are disabled; shell remains visible without animation", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.evaluate(() => {
      window.EvanPresenter?.show();
    });

    await expect(page.locator("#evan-assist-shell")).toBeVisible();

    const handTransition = await page.evaluate(() => {
      const hand = document.getElementById("evan-hand");
      if (!hand) return null;
      return window.getComputedStyle(hand).transition;
    });

    expect(handTransition).toBe("none");

    const shellHidden = await page.evaluate(() => {
      const shell = document.getElementById("evan-assist-shell");
      return shell?.hidden;
    });

    expect(shellHidden).toBe(false);
  });

  test('#evan-assist-label text reads "Mr. Evan helping out"', async ({
    page,
  }) => {
    const labelText = await page.locator("#evan-assist-label").textContent();
    expect(labelText).toBe("Mr. Evan helping out");
  });
});
