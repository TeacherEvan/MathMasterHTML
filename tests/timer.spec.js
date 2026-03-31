// @ts-check
import { expect, test } from "@playwright/test";

async function solveCurrentProblem(page) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const nextStep = await page.evaluate(() => {
      const currentStepIndex =
        window.GameProblemManager?.currentSolutionStepIndex ?? 0;
      const hiddenSymbol = document.querySelector(
        `.hidden-symbol[data-step-index="${currentStepIndex}"]`,
      );

      return {
        symbol: hiddenSymbol?.textContent || null,
        hiddenCount: document.querySelectorAll(".hidden-symbol").length,
      };
    });

    if (!nextStep.hiddenCount) {
      return;
    }

    if (!nextStep.symbol) {
      await page.waitForTimeout(180);
      continue;
    }

    await page.evaluate((symbol) => {
      document.dispatchEvent(
        new CustomEvent("symbolClicked", { detail: { symbol } }),
      );
    }, nextStep.symbol);
    await page.waitForTimeout(120);
  }

  throw new Error("Failed to solve current problem within guard limit");
}

test.describe("Timer and Score Countdown", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    // Navigate to game page
    await page.goto("/game.html?level=beginner");

    // Dismiss the modal if present (some runs may already start without it).
    const startButton = page.locator("#start-game-btn");
    if (await startButton.isVisible()) {
      await startButton.click({ force: true });
      // Wait for modal to fade out
      await page.waitForTimeout(500);
    }

    // Ensure HUD is present before proceeding.
    await expect(page.locator("#timer-value")).toBeVisible({ timeout: 10000 });
  });

  test("timer should count down from 600", async ({ page }) => {
    const timerValue = page.locator("#timer-value");

    // Get initial timer value
    const initialValue = await timerValue.textContent();
    console.log("Initial timer value:", initialValue);
    const initialNum = parseInt(initialValue || "0");
    expect(initialNum).toBeGreaterThan(0);
    expect(initialNum).toBeLessThanOrEqual(600);

    // Wait 3 seconds and check timer has decreased
    await page.waitForTimeout(3000);

    const laterValue = await timerValue.textContent();
    console.log("Timer value after 3s:", laterValue);
    const laterNum = parseInt(laterValue || "0");

    // Timer should have decreased (be less than initial)
    expect(laterNum).toBeLessThan(initialNum);
    // Allow startup/CPU variance (modal fade, loading, scheduling)
    expect(laterNum).toBeGreaterThanOrEqual(Math.max(0, initialNum - 30));
  });

  test("score should count down from 10000", async ({ page }) => {
    const scoreValue = page.locator("#score-value");

    // Get initial score value
    const initialValue = await scoreValue.textContent();
    console.log("Initial score value:", initialValue);
    const initialNum = parseInt(initialValue || "0");
    // Countdown may already have started by the time we read this.
    expect(initialNum).toBeGreaterThan(0);
    expect(initialNum).toBeLessThanOrEqual(10000);

    await expect
      .poll(
        async () => {
          const value = await scoreValue.textContent();
          const parsedValue = parseInt(value || "0", 10);
          console.log("Polled score value:", parsedValue);
          return parsedValue;
        },
        {
          timeout: 10_000,
          message: "expected score countdown to start within 10 seconds",
        },
      )
      .toBeLessThan(initialNum);

    await page.waitForTimeout(1000);
    const settledValue = await scoreValue.textContent();
    console.log("Score value after countdown settles:", settledValue);
    const settledNum = parseInt(settledValue || "0", 10);

    // Score should have decreased (be less than initial)
    expect(settledNum).toBeLessThanOrEqual(initialNum);
    // Score decreases linearly over 600 seconds, so after 3s it should be ~9950
    // Tolerance is intentionally wide to avoid flakiness on slower runners.
    expect(settledNum).toBeGreaterThanOrEqual(9800);
    expect(settledNum).toBeLessThanOrEqual(9998);
  });

  test("debug: check console logs for timer events", async ({ page }) => {
    // Collect console messages
    /** @type {string[]} */
    const consoleMessages = [];
    page.on("console", (msg) => {
      if (msg.text().includes("⏱️") || msg.text().includes("🎮 DEBUG")) {
        consoleMessages.push(msg.text());
      }
    });

    // Wait for timer events
    await page.waitForTimeout(5000);

    // Print all timer-related console messages
    console.log("Timer console messages:", consoleMessages);

    // Check that timer ticks are happening (validates timer functionality)
    const tickLogs = consoleMessages.filter((m) => m.includes("Timer tick:"));
    expect(tickLogs.length).toBeGreaterThan(0);
  });

  test("timer resumes counting down after the next problem loads", async ({
    page,
  }) => {
    const problemText = page.locator(".problem-text");
    const timerValue = page.locator("#timer-value");

    const firstProblem = await problemText.textContent();
    await solveCurrentProblem(page);

    const skipButton = page.locator("#skip-button");
    await expect(skipButton).toBeVisible({ timeout: 6000 });
    await skipButton.click();

    await expect(skipButton).toBeHidden({ timeout: 6000 });
    await expect(problemText).not.toHaveText(firstProblem || "", {
      timeout: 6000,
    });

    const nextProblemTimer = parseInt(
      (await timerValue.textContent()) || "0",
      10,
    );
    expect(nextProblemTimer).toBeGreaterThanOrEqual(598);
    expect(nextProblemTimer).toBeLessThanOrEqual(600);

    await page.waitForTimeout(2200);

    const laterTimer = parseInt((await timerValue.textContent()) || "0", 10);
    expect(laterTimer).toBeLessThan(nextProblemTimer);
  });
});
