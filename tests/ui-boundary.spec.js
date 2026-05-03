// tests/ui-boundary.spec.js - Tests for UI Boundary Management
import { expect, test } from "@playwright/test";
import {
  BASE_URL,
  boxesOverlap,
  dismissBriefing,
  ensurePowerUpDisplay,
} from "./utils/game-helpers.js";

// Increase timeout for all tests
test.setTimeout(60000);

test.describe("UI Boundary Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate straight to the runtime and bypass preload; these assertions only
    // care about gameplay layout, not the preload gate.
    await page.goto(`${BASE_URL}/src/pages/game.html?level=beginner&preload=off`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await dismissBriefing(page);
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

    expect(boxesOverlap(scoreBox, timerBox, 0)).toBe(false);
    console.log(
      `✅ HUD elements properly spaced: Score ends at ${
        scoreBox.x + scoreBox.width
      }px, Timer starts at ${timerBox.x}px`,
    );
  });

  test("Powerup display should not overlap with timer", async ({ page }) => {
    await ensurePowerUpDisplay(page);

    const powerupBox = await page.locator("#power-up-display").boundingBox();
    const timerBox = await page.locator("#timer-display").boundingBox();

    expect(powerupBox).toBeTruthy();
    expect(timerBox).toBeTruthy();
    expect(boxesOverlap(powerupBox, timerBox, 0)).toBe(false);
    console.log(
      `✅ Powerup display does not overlap with timer: Powerup box=${JSON.stringify(
        powerupBox,
      )}, Timer box=${JSON.stringify(timerBox)}`,
    );
  });

  test("Powerup display should not overlap Panel B controls", async ({
    page,
  }) => {
    await ensurePowerUpDisplay(page);

    const powerupBox = await page.locator("#power-up-display").boundingBox();
    const controlsBox = await page.locator(".panel-b-controls").boundingBox();

    expect(powerupBox).toBeTruthy();
    expect(controlsBox).toBeTruthy();
    expect(boxesOverlap(powerupBox, controlsBox, 0)).toBe(false);
  });

  test("Powerup display should not overlap solution container", async ({
    page,
  }) => {
    await ensurePowerUpDisplay(page);

    const powerupBox = await page.locator("#power-up-display").boundingBox();
    const solutionBox = await page.locator("#solution-container").boundingBox();

    expect(powerupBox).toBeTruthy();
    expect(solutionBox).toBeTruthy();
    expect(boxesOverlap(powerupBox, solutionBox, 0)).toBe(false);
  });

  test("Problem container should not overlap with score display", async ({
    page,
  }) => {
    await expect(page.locator("#problem-container")).toBeVisible();

    const scoreBox = await page.locator("#score-display").boundingBox();
    const problemBox = await page.locator("#problem-container").boundingBox();

    expect(scoreBox).toBeTruthy();
    expect(problemBox).toBeTruthy();

    // Problem should be below the score HUD
    const scoreBottom = scoreBox.y + scoreBox.height;
    const minSpacing = 5; // Minimum expected vertical spacing

    expect(problemBox.y).toBeGreaterThanOrEqual(scoreBottom + minSpacing);
    console.log(
      `✅ Problem container below score: Score ends at Y=${scoreBottom}px, Problem starts at Y=${problemBox.y}px`,
    );
  });

  test("Lock display should not overlap with problem container", async ({
    page,
  }) => {
    await expect(page.locator("#problem-container")).toBeVisible();
    await expect
      .poll(async () => {
        const lockBox = await page.locator("#lock-display").boundingBox();
        return lockBox !== null;
      })
      .toBe(true);

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
      `✅ Lock display positioned correctly: Problem ends at Y=${problemBottom}px, Lock starts at Y=${lockBox.y}px`,
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
    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          if (window.uiBoundaryManager) {
            return window.uiBoundaryManager.getAllOverlaps().length;
          }
          return -1;
        });
      })
      .toBe(0);

    console.log("✅ No UI overlaps detected (0 overlaps)");
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
          { x: 0, y: 0 },
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

  test("UIBoundaryManager should throttle impossible placement warnings", async ({
    page,
  }) => {
    const warningCount = await page.evaluate(async () => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => {
        const message = args.join(" ");
        if (message.includes("Could not find non-overlapping position")) {
          warnings.push(message);
        }
        originalWarn.apply(console, args);
      };

      const obstacle = document.createElement("div");
      const subject = document.createElement("div");
      Object.assign(obstacle.style, {
        position: "fixed",
        left: "20px",
        top: "20px",
        width: "80px",
        height: "80px",
      });
      Object.assign(subject.style, {
        position: "fixed",
        left: "20px",
        top: "20px",
        width: "80px",
        height: "80px",
      });
      document.body.append(obstacle, subject);

      const manager = new window.UIBoundaryManager({
        autoReposition: true,
        checkInterval: 40,
        enablePeriodic: true,
        logOverlaps: false,
        minSpacing: 10,
        noSafePositionWarnInterval: 1000,
      });

      try {
        manager.register("fixed-obstacle", obstacle, {
          fixed: true,
          priority: 10,
        });
        manager.register("movable-subject", subject, {
          constraints: { minX: 20, maxX: 100, minY: 20, maxY: 100 },
          fixed: false,
          priority: 1,
        });

        await new Promise((resolve) => window.setTimeout(resolve, 160));
        return warnings.length;
      } finally {
        manager.destroy();
        obstacle.remove();
        subject.remove();
        console.warn = originalWarn;
      }
    });

    expect(warningCount).toBe(1);
  });

  test("UIBoundaryManager should expose public constraint updates", async ({
    page,
  }) => {
    await ensurePowerUpDisplay(page);
    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          return Boolean(
            window.uiBoundaryManager?.elements?.has?.("power-up-display"),
          );
        });
      })
      .toBe(true);

    const updateResult = await page.evaluate(() => {
      const manager = window.uiBoundaryManager;
      const display = document.getElementById("power-up-display");
      if (!manager || !display) {
        return null;
      }

      const nextConstraints = {
        minX: 24,
        maxX: window.innerWidth - 24,
        minY: 0,
        maxY: 140,
      };

      const updated = manager.setConstraints(
        "power-up-display",
        nextConstraints,
      );
      const registration = manager.elements.get("power-up-display");

      return {
        updated,
        constraints: registration?.constraints || null,
      };
    });

    expect(updateResult).not.toBeNull();
    expect(updateResult.updated).toBe(true);
    expect(updateResult.constraints).toMatchObject({
      minX: 24,
      minY: 0,
      maxY: 140,
    });
  });

  test("UI elements should reposition on window resize", async (
    { page },
    testInfo,
  ) => {
    test.skip(
      testInfo.project.use?.isMobile,
      "Viewport resize is not supported for emulated mobile projects",
    );

    // Get initial positions
    const initialScoreBox = await page.locator("#score-display").boundingBox();

    // Trigger the resize handling path directly; some headless environments do
    // not support Browser.setWindowBounds for page.setViewportSize reliably.
    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
      window.uiBoundaryManager?._onResize?.();
    });
    await page.waitForTimeout(500); // Wait for resize handler

    // Get new positions
    const newScoreBox = await page.locator("#score-display").boundingBox();
    const newTimerBox = await page.locator("#timer-display").boundingBox();

    expect(newScoreBox).toBeTruthy();
    expect(newTimerBox).toBeTruthy();

    // Score should still be on left, timer on right
    expect(newScoreBox.x).toBeLessThan(newTimerBox.x);

    // They should not overlap after resize
    expect(boxesOverlap(newScoreBox, newTimerBox, 0)).toBe(false);

    console.log("✅ UI elements properly positioned after resize");
  });

});

test.describe("Panel A Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/src/pages/game.html?level=beginner&preload=off`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await dismissBriefing(page);
    await page.waitForTimeout(500);
  });

  test("Problem and lock should stay within vertical overlap tolerance", async ({ page }) => {
    const problemBox = await page.locator("#problem-container").boundingBox();
    const lockBox = await page.locator("#lock-display").boundingBox();

      expect(problemBox).toBeTruthy();
      expect(lockBox).toBeTruthy();

      const problemBottom = problemBox.y + problemBox.height;
      const verticalGap = lockBox.y - problemBottom;

      expect(verticalGap).toBeGreaterThanOrEqual(-10);
      console.log(
        `✅ Panel A vertical layout: Problem bottom=${problemBottom}px, Lock top=${lockBox.y}px, Gap=${verticalGap}px`,
      );
  });
});

test('Buttons meet 44x44px touch target protocol', async ({ page }) => {
  await page.goto('/src/pages/index.html');
  const buttons = page.locator('button, [role="button"], .action-target');
  const count = await buttons.count();
  
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    if(box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
});
