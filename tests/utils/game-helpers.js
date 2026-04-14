// tests/utils/game-helpers.js - Shared game test helpers
import { expect } from "@playwright/test";
import { ensureLandscapeGameplayViewport } from "./onboarding-runtime.js";

export const BASE_URL = "http://localhost:8000";

/**
 * Dismisses the how-to-play modal by clicking the start button
 * and waiting for the modal to close.
 */
export async function dismissBriefing(page) {
  await ensureLandscapeGameplayViewport(page);

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

/**
 * Ensures the power-up display is visible by initializing the power-up system
 * and adding a test item to the inventory.
 */
export async function ensurePowerUpDisplay(page) {
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

/**
 * Checks if two bounding boxes overlap, with optional spacing tolerance.
 * Returns true if boxes overlap, false otherwise.
 */
export function boxesOverlap(boxA, boxB, spacing = 0) {
  if (!boxA || !boxB) return false;

  return !(
    boxA.x + boxA.width + spacing <= boxB.x ||
    boxB.x + boxB.width + spacing <= boxA.x ||
    boxA.y + boxA.height + spacing <= boxB.y ||
    boxB.y + boxB.height + spacing <= boxA.y
  );
}
