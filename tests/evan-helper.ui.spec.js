// tests/evan-helper.ui.spec.js - Evan Helper UI Coverage (Build 3)
import { expect, test } from "@playwright/test";
import {
  BASE_URL,
  dismissBriefing,
  ensurePowerUpDisplay,
} from "./utils/game-helpers.js";

test.setTimeout(30000);

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

  test("default-motion: Evan hand uses a smoother transition curve", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.EvanPresenter?.show();
      window.EvanPresenter?.moveHandTo(24, 24);
    });

    await expect(page.locator("#evan-assist-shell")).toBeVisible();
    await page.waitForFunction(() => {
      const hand = document.getElementById("evan-hand");
      return hand?.style.transform.includes("24px") === true;
    });

    const handTransition = await page.evaluate(() => {
      const hand = document.getElementById("evan-hand");
      if (!hand) return null;
      return window.getComputedStyle(hand).transition;
    });

    expect(handTransition).toContain("0.32s");
    expect(handTransition).toContain("cubic-bezier");
  });

  test('#evan-assist-label text reads "Mr. Evan helping out"', async ({
    page,
  }) => {
    const labelText = await page.locator("#evan-assist-label").textContent();
    expect(labelText).toBe("Mr. Evan helping out");
  });
});
