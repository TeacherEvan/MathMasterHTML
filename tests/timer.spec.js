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
    await page.goto("/game.html?level=beginner");

    const startButton = page.locator("#start-game-btn");
    if (await startButton.isVisible()) {
      await startButton.click({ force: true });
      await page.waitForTimeout(500);
    }

    await expect(page.locator("#timer-value")).toBeVisible({ timeout: 10000 });
  });

  test("timer should count down from 600", async ({ page }) => {
    const timerValue = page.locator("#timer-value");
    const initialValue = await timerValue.textContent();
    const initialNum = parseInt(initialValue || "0");
    expect(initialNum).toBeGreaterThan(0);
    expect(initialNum).toBeLessThanOrEqual(600);

    await page.waitForTimeout(3000);

    const laterValue = await timerValue.textContent();
    const laterNum = parseInt(laterValue || "0");
    expect(laterNum).toBeLessThan(initialNum);
    expect(laterNum).toBeGreaterThanOrEqual(Math.max(0, initialNum - 30));
  });

  test("score should count down from 10000", async ({ page }) => {
    const scoreValue = page.locator("#score-value");
    const initialValue = await scoreValue.textContent();
    const initialNum = parseInt(initialValue || "0");
    expect(initialNum).toBeGreaterThan(0);
    expect(initialNum).toBeLessThanOrEqual(10000);

    await expect
      .poll(
        async () => {
          const value = await scoreValue.textContent();
          return parseInt(value || "0", 10);
        },
        {
          timeout: 10_000,
          message: "expected score countdown to start within 10 seconds",
        },
      )
      .toBeLessThan(initialNum);

    await page.waitForTimeout(1000);
    const settledValue = await scoreValue.textContent();
    const settledNum = parseInt(settledValue || "0", 10);
    expect(settledNum).toBeLessThanOrEqual(initialNum);
    expect(settledNum).toBeGreaterThanOrEqual(9800);
    expect(settledNum).toBeLessThanOrEqual(9998);
  });

  test("debug: check console logs for timer events", async ({ page }) => {
    /** @type {string[]} */
    const consoleMessages = [];
    page.on("console", (msg) => {
      if (msg.text().includes("⏱️") || msg.text().includes("🎮 DEBUG")) {
        consoleMessages.push(msg.text());
      }
    });

    await page.waitForTimeout(5000);
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

    await expect(async () => {
      const laterTimer = parseInt((await timerValue.textContent()) || "0", 10);
      expect(laterTimer).toBeLessThan(nextProblemTimer);
    }).toPass({ timeout: 6000 });
  });
});
