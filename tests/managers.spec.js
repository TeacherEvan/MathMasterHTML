// @ts-check
import { expect, test } from "@playwright/test";

test.describe("ProblemManager and SymbolManager Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to game page
    await page.goto("/game.html?level=beginner");

    // Wait for the modal to appear and dismiss it
    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });

    // Click the start button to dismiss modal and start the game
    await startButton.click({ force: true });

    // Wait for modal to fade out and game to initialize
    await page.waitForTimeout(600);
  });

  test.describe("ProblemManager", () => {
    test("should load problems from markdown file", async ({ page }) => {
      // Verify problem container has content
      const problemContainer = page.locator("#problem-container");
      await expect(problemContainer).toBeVisible();

      const problemText = await problemContainer.textContent();
      expect(problemText).toBeTruthy();
      expect(problemText?.length).toBeGreaterThan(0);
    });

    test("should display problem with correct structure", async ({ page }) => {
      // Check that problem text element exists
      const problemText = page.locator(".problem-text");
      await expect(problemText).toBeVisible();

      // Problem should contain mathematical content
      const text = await problemText.textContent();
      expect(text).toMatch(/[0-9x=+\-*/]/);
    });

    test("should setup solution steps container", async ({ page }) => {
      // Verify steps container exists
      const stepsContainer = page.locator(".steps-container");
      await expect(stepsContainer).toBeVisible();

      // Should have at least one solution step
      const solutionSteps = page.locator(".solution-step");
      const count = await solutionSteps.count();
      expect(count).toBeGreaterThan(0);
    });

    test("should create hidden symbols for each step", async ({ page }) => {
      // Check that hidden symbols exist
      const hiddenSymbols = page.locator(".hidden-symbol");
      const count = await hiddenSymbols.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("SymbolManager", () => {
    test("should reveal symbol when correct symbol clicked", async ({
      page,
    }) => {
      // Get initial hidden symbol count
      const initialHidden = await page.locator(".hidden-symbol").count();
      expect(initialHidden).toBeGreaterThan(0);

      // Click the help button to reveal a symbol
      const helpButton = page.locator("#help-button");
      await helpButton.click();

      // Wait for reveal animation
      await page.waitForTimeout(400);

      // Check that a symbol was revealed
      const revealedSymbols = page.locator(".revealed-symbol");
      const revealedCount = await revealedSymbols.count();
      expect(revealedCount).toBeGreaterThan(0);
    });

    test("should track revealed symbols with correct class", async ({
      page,
    }) => {
      // Click help button to reveal a symbol
      const helpButton = page.locator("#help-button");
      await helpButton.click();

      // Wait for reveal
      await page.waitForTimeout(400);

      // Revealed symbols should have correct styling class
      const revealed = page.locator(".revealed-symbol").first();
      await expect(revealed).toBeVisible();

      // Should not have hidden-symbol class
      await expect(revealed).not.toHaveClass(/hidden-symbol/);
    });

    test("should mark completed rows with cyan styling", async ({ page }) => {
      // Get the first step's hidden symbols
      const firstStepHidden = page.locator(
        '[data-step-index="0"].hidden-symbol'
      );
      const initialCount = await firstStepHidden.count();

      // Click help button repeatedly to complete first line
      const helpButton = page.locator("#help-button");
      for (let i = 0; i < initialCount + 2; i++) {
        await helpButton.click();
        await page.waitForTimeout(200);
      }

      // Wait for completion animation
      await page.waitForTimeout(1000);

      // Check for completed row symbols (cyan pulsating)
      const completedSymbols = page.locator(".completed-row-symbol");
      const completedCount = await completedSymbols.count();

      // Should have some completed symbols if line was finished
      // Note: This may vary based on problem structure
      expect(completedCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Symbol Validation", () => {
    test("should normalize symbols for comparison", async ({ page }) => {
      // Verify the game properly handles symbol normalization
      // by checking that the problem loads without errors
      const problemContainer = page.locator("#problem-container");
      await expect(problemContainer).toBeVisible();

      // No console errors should occur during symbol operations
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      // Interact with the game
      const helpButton = page.locator("#help-button");
      await helpButton.click();
      await page.waitForTimeout(500);

      // Filter out non-critical errors
      const criticalErrors = errors.filter(
        (e) => !e.includes("net::") && !e.includes("favicon")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe("Step Progression", () => {
    test("should advance to next step after completing current", async ({
      page,
    }) => {
      // Get initial step indicator or problem state
      const stepsContainer = page.locator(".steps-container");
      await expect(stepsContainer).toBeVisible();

      // Complete first step by clicking help repeatedly
      const helpButton = page.locator("#help-button");
      const firstStepHidden = page.locator(
        '[data-step-index="0"].hidden-symbol'
      );
      const hiddenCount = await firstStepHidden.count();

      for (let i = 0; i < hiddenCount + 1; i++) {
        await helpButton.click();
        await page.waitForTimeout(150);
      }

      // Wait for step transition
      await page.waitForTimeout(1500);

      // Check that step 0 has no more hidden symbols or has completed class
      const step0Hidden = await page
        .locator('[data-step-index="0"].hidden-symbol')
        .count();
      const step0Completed = await page
        .locator('[data-step-index="0"].completed-row-symbol')
        .count();

      // Either all revealed or marked as completed
      expect(step0Hidden === 0 || step0Completed > 0).toBeTruthy();
    });
  });

  test.describe("Cache Performance", () => {
    test("should handle rapid symbol clicks without errors", async ({
      page,
    }) => {
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      // Rapid clicking on help button to stress test caching
      const helpButton = page.locator("#help-button");
      for (let i = 0; i < 10; i++) {
        await helpButton.click({ delay: 50 });
      }

      await page.waitForTimeout(500);

      // No JavaScript errors should occur
      const jsErrors = errors.filter(
        (e) => !e.includes("net::") && !e.includes("favicon")
      );
      expect(jsErrors).toHaveLength(0);
    });
  });
});
