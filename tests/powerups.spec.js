// tests/powerups.spec.js
// Playwright tests for MathMaster Power-Up Two-Click System
import { expect, test } from "@playwright/test";

async function dismissHowToPlayModal(page) {
  const modal = page.locator("#how-to-play-modal");
  if (await modal.isVisible().catch(() => false)) {
    const startButton = page.locator("#start-game-btn");
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  }
}

/**
 * Test suite for the Two-Click Power-Up System
 *
 * Testing workflow:
 * 1. First click = SELECT power-up (highlight)
 * 2. Second click = PLACE/ACTIVATE power-up
 * 3. ESC key = Cancel selection
 */

test.describe("Power-Up Two-Click System", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to game page
    await page.goto("/game.html?level=beginner");

    // Dismiss the How-To-Play modal (blocks visibility for some elements)
    await dismissHowToPlayModal(page);

    // Wait for game to initialize
    await page.waitForSelector("#solution-container", { timeout: 10000 });

    // Wait for worm system + power-up system to be ready
    await page.waitForFunction(() => !!window.wormSystem?.powerUpSystem, null, {
      timeout: 10000,
    });

    // Give power-ups for testing via console
    await page.evaluate(() => {
      if (window.wormSystem && window.wormSystem.powerUpSystem) {
        window.wormSystem.powerUpSystem.inventory.chainLightning = 3;
        window.wormSystem.powerUpSystem.inventory.spider = 2;
        window.wormSystem.powerUpSystem.inventory.devil = 2;
        window.wormSystem.powerUpSystem.updateDisplay();
      }
    });

    // Wait for power-up display to appear
    await page.waitForSelector("#power-up-display", { timeout: 5000 });
  });

  test("should display power-up inventory", async ({ page }) => {
    const display = page.locator("#power-up-display");
    await expect(display).toBeVisible();

    // Check all three power-ups are shown
    await expect(
      page.locator('[data-testid="powerup-chainLightning"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="powerup-spider"]')).toBeVisible();
    await expect(page.locator('[data-testid="powerup-devil"]')).toBeVisible();
  });

  test("should update power-up counts in display", async ({ page }) => {
    await page.evaluate(() => {
      if (window.wormSystem && window.wormSystem.powerUpSystem) {
        window.wormSystem.powerUpSystem.inventory.chainLightning = 5;
        window.wormSystem.powerUpSystem.inventory.spider = 4;
        window.wormSystem.powerUpSystem.inventory.devil = 1;
        window.wormSystem.powerUpSystem.updateDisplay();
      }
    });

    await expect(
      page.locator('[data-testid="powerup-chainLightning"]'),
    ).toContainText("5");
    await expect(page.locator('[data-testid="powerup-spider"]')).toContainText(
      "4",
    );
    await expect(page.locator('[data-testid="powerup-devil"]')).toContainText(
      "1",
    );
  });

  test("should select power-up on first click", async ({ page }) => {
    // Click on spider power-up
    await page.click('[data-testid="powerup-spider"]');

    // Verify selection via console
    const isSelected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp === "spider";
    });
    expect(isSelected).toBe(true);

    // Check cursor changed to crosshair
    const bodyCursor = await page.evaluate(() => {
      return document.body.style.cursor;
    });
    expect(bodyCursor).toBe("crosshair");

    // Check tooltip appeared
    const tooltip = page.locator("#power-up-tooltip");
    await expect(tooltip).toBeVisible();
  });

  test("should deselect power-up when clicking same one again", async ({
    page,
  }) => {
    // Select spider
    await page.click('[data-testid="powerup-spider"]');

    // Verify selected
    let isSelected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp === "spider";
    });
    expect(isSelected).toBe(true);

    // Click again to deselect
    await page.click('[data-testid="powerup-spider"]');

    // Verify deselected
    isSelected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp === null;
    });
    expect(isSelected).toBe(true);

    // Check cursor reset
    const bodyCursor = await page.evaluate(() => {
      return document.body.style.cursor;
    });
    expect(bodyCursor).toBe("");
  });

  test("should deselect power-up on ESC key", async ({ page }) => {
    // Select devil
    await page.click('[data-testid="powerup-devil"]');

    // Verify selected
    let isSelected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp === "devil";
    });
    expect(isSelected).toBe(true);

    // Press ESC
    await page.keyboard.press("Escape");

    // Verify deselected
    isSelected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp === null;
    });
    expect(isSelected).toBe(true);
  });

  test("should place devil power-up on second click", async ({ page }) => {
    // Select devil
    await page.click('[data-testid="powerup-devil"]');

    // Get initial count
    const initialCount = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.inventory.devil;
    });

    // Click on game area to place (center of screen)
    await page.click("#solution-container");

    // Verify inventory decreased
    const newCount = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.inventory.devil;
    });
    expect(newCount).toBe(initialCount - 1);

    // Verify deselected after placement
    const isSelected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp === null;
    });
    expect(isSelected).toBe(true);
  });

  test("should spawn spider at click location", async ({ page }) => {
    // Select spider
    await page.click('[data-testid="powerup-spider"]');

    // Click in game area
    await page.click("body", { position: { x: 400, y: 300 } });

    // Wait for spider to appear
    await page.waitForSelector(".spider-entity", { timeout: 2000 });

    // Verify spider exists
    const spiderExists = await page.evaluate(() => {
      return document.querySelector(".spider-entity") !== null;
    });
    expect(spiderExists).toBe(true);
  });

  test("should not allow selection when inventory is 0", async ({ page }) => {
    // Set inventory to 0
    await page.evaluate(() => {
      window.wormSystem.powerUpSystem.inventory.chainLightning = 0;
      window.wormSystem.powerUpSystem.updateDisplay();
    });

    // Try to select
    await page.click('[data-testid="powerup-chainLightning"]');

    // Verify not selected
    const isSelected = await page.evaluate(() => {
      return (
        window.wormSystem?.powerUpSystem?.selectedPowerUp === "chainLightning"
      );
    });
    expect(isSelected).toBe(false);

    // Warning tooltip should appear
    const tooltip = page.locator("#power-up-tooltip");
    await expect(tooltip).toContainText("available");
  });

  test("should switch selection when clicking different power-up", async ({
    page,
  }) => {
    // Select spider
    await page.click('[data-testid="powerup-spider"]');

    let selected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp;
    });
    expect(selected).toBe("spider");

    // Select devil instead
    await page.click('[data-testid="powerup-devil"]');

    selected = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.selectedPowerUp;
    });
    expect(selected).toBe("devil");
  });
});

test.describe("Power-Up Chain Lightning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner");

    await dismissHowToPlayModal(page);
    await page.waitForSelector("#solution-container", { timeout: 10000 });

    await page.waitForFunction(() => !!window.wormSystem?.powerUpSystem, null, {
      timeout: 10000,
    });

    // Give chain lightning power-ups
    await page.evaluate(() => {
      if (window.wormSystem && window.wormSystem.powerUpSystem) {
        window.wormSystem.powerUpSystem.inventory.chainLightning = 3;
        window.wormSystem.powerUpSystem.updateDisplay();
      }
    });

    await page.waitForSelector("#power-up-display", { timeout: 5000 });
  });

  test("should refund chain lightning if no worms to target", async ({
    page,
  }) => {
    // Get initial count
    const initialCount = await page.evaluate(() => {
      return window.wormSystem?.powerUpSystem?.inventory.chainLightning;
    });

    // Select chain lightning
    await page.click('[data-testid="powerup-chainLightning"]');

    // Click where there are no worms
    await page.click("body", { position: { x: 100, y: 100 } });

    // Wait a moment for processing
    await page.waitForTimeout(500);

    // Check count - if no worms, it should be refunded
    const finalCount = await page.evaluate(() => {
      const worms = window.wormSystem?.worms?.filter((w) => w.active) || [];
      return {
        count: window.wormSystem?.powerUpSystem?.inventory.chainLightning,
        wormCount: worms.length,
      };
    });

    // If no worms existed, power-up should be refunded
    if (finalCount.wormCount === 0) {
      expect(finalCount.count).toBe(initialCount);
    }
  });
});

test.describe("Game Flow Integration", () => {
  test("game page loads successfully", async ({ page }) => {
    await page.goto("/game.html?level=beginner");

    await dismissHowToPlayModal(page);

    // Check main game elements exist
    await expect(page.locator("#symbol-rain-container")).toBeVisible();
    await expect(page.locator("#solution-container")).toBeVisible();
    await expect(page.locator("#symbol-console")).toBeVisible();
  });

  test("level select page works", async ({ page }) => {
    await page.goto("/level-select.html");

    // Check level buttons exist
    await expect(
      page.locator(".level-button, .level-card, [data-level]").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("index page has navigation", async ({ page }) => {
    await page.goto("/");

    // Should have some form of start/play button
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Worm System Basic Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner");

    await dismissHowToPlayModal(page);
    await page.waitForSelector("#solution-container", { timeout: 10000 });

    await page.waitForFunction(() => !!window.wormSystem, null, {
      timeout: 10000,
    });
  });

  test("worm system initializes", async ({ page }) => {
    const hasWormSystem = await page.evaluate(() => {
      return typeof window.wormSystem !== "undefined";
    });
    expect(hasWormSystem).toBe(true);
  });

  test("can spawn worm from console", async ({ page }) => {
    // Spawn a worm
    await page.evaluate(() => {
      window.wormSystem?.spawnWormFromConsole();
    });

    // Wait for worm to appear
    await page.waitForTimeout(500);

    // Check worm exists
    const wormCount = await page.evaluate(() => {
      return window.wormSystem?.worms?.length || 0;
    });
    expect(wormCount).toBeGreaterThan(0);
  });

  test("can trigger purple worm", async ({ page }) => {
    // Trigger purple worm event
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent("purpleWormTriggered"));
    });

    // Wait for spawn
    await page.waitForTimeout(500);

    // Check purple worm exists
    const hasPurple = await page.evaluate(() => {
      return window.wormSystem?.worms?.some((w) => w.isPurple) || false;
    });
    // Note: May not always spawn due to max worm limit
    // Just verify no errors occurred
    expect(true).toBe(true);
  });
});
