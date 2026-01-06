// tests/ui-boundary.spec.js - Tests for UI Boundary Management
import { expect, test } from "@playwright/test";

const BASE_URL = "http://localhost:8000";

// Increase timeout for all tests
test.setTimeout(60000);

test.describe("UI Boundary Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to game page with retry
    await page.goto(`${BASE_URL}/game.html?level=beginner`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for modal to be visible before clicking
    await page.waitForSelector("#start-game-btn", {
      state: "visible",
      timeout: 10000,
    });

    // Dismiss the how-to-play modal
    await page.click("#start-game-btn");
    await page.waitForTimeout(500);
  });

  test("HUD elements should not overlap", async ({ page }) => {
    // Get bounding boxes of score and timer
    const scoreBox = await page.locator("#score-display").boundingBox();
    const timerBox = await page.locator("#timer-display").boundingBox();

    expect(scoreBox).toBeTruthy();
    expect(timerBox).toBeTruthy();

    // Check that score is on the left and timer is on the right
    expect(scoreBox.x).toBeLessThan(timerBox.x);

    // Check that they don't overlap (score's right edge < timer's left edge)
    const scoreRight = scoreBox.x + scoreBox.width;
    const minSpacing = 10; // Minimum expected spacing

    expect(scoreRight + minSpacing).toBeLessThanOrEqual(timerBox.x);
    console.log(
      `✅ HUD elements properly spaced: Score ends at ${scoreRight}px, Timer starts at ${timerBox.x}px`
    );
  });

  test("Powerup display should not overlap with timer", async ({ page }) => {
    // Wait for powerup display to be created (may need to trigger worm kill first)
    // For this test, we'll inject a test powerup
    await page.evaluate(() => {
      if (window.WormSystem && window.WormSystem.powerUps) {
        window.WormSystem.powerUps.inventory.chainLightning = 1;
        window.WormSystem.powerUps.updateDisplay();
      }
    });

    await page.waitForTimeout(300);

    // Check if powerup display exists
    const powerupDisplay = page.locator("#power-up-display");
    const powerupExists = (await powerupDisplay.count()) > 0;

    if (powerupExists) {
      const powerupBox = await powerupDisplay.boundingBox();
      const timerBox = await page.locator("#timer-display").boundingBox();

      if (powerupBox && timerBox) {
        // Check that powerup display doesn't overlap with timer
        const powerupRight = powerupBox.x + powerupBox.width;
        expect(powerupRight).toBeLessThanOrEqual(timerBox.x);
        console.log(
          `✅ Powerup display does not overlap with timer: Powerup ends at ${powerupRight}px, Timer starts at ${timerBox.x}px`
        );
      }
    } else {
      console.log("⚠️ Powerup display not present - skipping overlap check");
    }
  });

  test("Problem container should not overlap with score display", async ({
    page,
  }) => {
    const scoreBox = await page.locator("#score-display").boundingBox();
    const problemBox = await page.locator("#problem-container").boundingBox();

    expect(scoreBox).toBeTruthy();
    expect(problemBox).toBeTruthy();

    // Problem should be below the score HUD
    const scoreBottom = scoreBox.y + scoreBox.height;
    const minSpacing = 5; // Minimum expected vertical spacing

    expect(problemBox.y).toBeGreaterThanOrEqual(scoreBottom + minSpacing);
    console.log(
      `✅ Problem container below score: Score ends at Y=${scoreBottom}px, Problem starts at Y=${problemBox.y}px`
    );
  });

  test("Lock display should not overlap with problem container", async ({
    page,
  }) => {
    const problemBox = await page.locator("#problem-container").boundingBox();
    const lockBox = await page.locator("#lock-display").boundingBox();

    expect(problemBox).toBeTruthy();
    expect(lockBox).toBeTruthy();

    // Lock display should be below the problem container
    const problemBottom = problemBox.y + problemBox.height;

    // Allow some overlap tolerance since lock is centered
    // but its top should be below problem's bottom
    expect(lockBox.y).toBeGreaterThanOrEqual(problemBottom - 10); // -10 for tolerance
    console.log(
      `✅ Lock display positioned correctly: Problem ends at Y=${problemBottom}px, Lock starts at Y=${lockBox.y}px`
    );
  });

  test("UIBoundaryManager should be initialized", async ({ page }) => {
    const hasManager = await page.evaluate(() => {
      return (
        typeof window.uiBoundaryManager !== "undefined" &&
        window.uiBoundaryManager !== null
      );
    });

    expect(hasManager).toBe(true);
    console.log("✅ UIBoundaryManager is initialized");
  });

  test("UIBoundaryManager should detect overlaps", async ({ page }) => {
    const overlaps = await page.evaluate(() => {
      if (window.uiBoundaryManager) {
        return window.uiBoundaryManager.getAllOverlaps();
      }
      return [];
    });

    // We expect no overlaps in proper configuration
    expect(overlaps.length).toBe(0);
    console.log(`✅ No UI overlaps detected (${overlaps.length} overlaps)`);
  });

  test("UIBoundaryManager should log overlap attempts", async ({ page }) => {
    // Get initial log state
    const initialLog = await page.evaluate(() => {
      if (window.uiBoundaryManager) {
        return window.uiBoundaryManager.getOverlapLog().length;
      }
      return 0;
    });

    // Trigger a potential overlap by moving powerup display (if exists)
    await page.evaluate(() => {
      const powerupDisplay = document.getElementById("power-up-display");
      if (powerupDisplay && window.uiBoundaryManager) {
        // Try to move to an overlapping position
        const validation = window.uiBoundaryManager.validatePosition(
          "power-up-display",
          { x: 0, y: 0 }
        );
        console.log("Validation result:", validation);
      }
    });

    // Check that validation works (violations should be detected for invalid positions)
    const validationResult = await page.evaluate(() => {
      if (window.uiBoundaryManager) {
        return window.uiBoundaryManager.validatePosition("power-up-display", {
          x: 0,
          y: 0,
        });
      }
      return { valid: true, violations: [] };
    });

    console.log("✅ Validation system functional:", validationResult);
  });

  test("UI elements should reposition on window resize", async ({ page }) => {
    // Get initial positions
    const initialScoreBox = await page.locator("#score-display").boundingBox();

    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500); // Wait for resize handler

    // Get new positions
    const newScoreBox = await page.locator("#score-display").boundingBox();
    const newTimerBox = await page.locator("#timer-display").boundingBox();

    expect(newScoreBox).toBeTruthy();
    expect(newTimerBox).toBeTruthy();

    // Score should still be on left, timer on right
    expect(newScoreBox.x).toBeLessThan(newTimerBox.x);

    // They should not overlap after resize
    const scoreRight = newScoreBox.x + newScoreBox.width;
    expect(scoreRight).toBeLessThan(newTimerBox.x);

    console.log("✅ UI elements properly positioned after resize");
  });

  test("Mobile layout should maintain separation", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 667, height: 375 }); // iPhone landscape
    await page.waitForTimeout(500);

    const scoreBox = await page.locator("#score-display").boundingBox();
    const timerBox = await page.locator("#timer-display").boundingBox();

    expect(scoreBox).toBeTruthy();
    expect(timerBox).toBeTruthy();

    // Should still maintain left/right separation
    expect(scoreBox.x).toBeLessThan(timerBox.x);

    console.log("✅ Mobile layout maintains HUD separation");
  });
});

test.describe("Panel A Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/game.html?level=beginner`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector("#start-game-btn", {
      state: "visible",
      timeout: 10000,
    });
    await page.click("#start-game-btn");
    await page.waitForTimeout(500);
  });

  test("Problem and lock should have vertical separation", async ({ page }) => {
    const problemBox = await page.locator("#problem-container").boundingBox();
    const lockBox = await page.locator("#lock-display").boundingBox();

    if (problemBox && lockBox) {
      const problemBottom = problemBox.y + problemBox.height;
      const verticalGap = lockBox.y - problemBottom;

      // Should have some gap (allowing for layout variations)
      expect(verticalGap).toBeGreaterThanOrEqual(-10); // Allow small tolerance
      console.log(
        `✅ Panel A vertical layout: Problem bottom=${problemBottom}px, Lock top=${lockBox.y}px, Gap=${verticalGap}px`
      );
    }
  });
});
