// @ts-check
import { expect, test } from "@playwright/test";

test.describe("Timer and Score Countdown", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to game page
    await page.goto("/game.html?level=beginner");

    // Wait for the modal to appear and dismiss it
    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });

    // Click the start button to dismiss modal and start the game
    await startButton.click({ force: true });

    // Wait for modal to fade out
    await page.waitForTimeout(500);
  });

  test("timer should count down from 60", async ({ page }) => {
    const timerValue = page.locator("#timer-value");

    // Get initial timer value
    const initialValue = await timerValue.textContent();
    console.log("Initial timer value:", initialValue);
    const initialNum = parseInt(initialValue || "0");
    expect(initialNum).toBeGreaterThan(0);
    expect(initialNum).toBeLessThanOrEqual(60);

    // Wait 3 seconds and check timer has decreased
    await page.waitForTimeout(3000);

    const laterValue = await timerValue.textContent();
    console.log("Timer value after 3s:", laterValue);
    const laterNum = parseInt(laterValue || "0");

    // Timer should have decreased (be less than initial)
    expect(laterNum).toBeLessThan(initialNum);
    // Allow some startup timing variance (modal fade, loading, scheduling)
    expect(laterNum).toBeGreaterThanOrEqual(Math.max(0, initialNum - 10));
  });

  test("score should count down from 1000", async ({ page }) => {
    const scoreValue = page.locator("#score-value");

    // Get initial score value
    const initialValue = await scoreValue.textContent();
    console.log("Initial score value:", initialValue);
    const initialNum = parseInt(initialValue || "0");
    // Countdown may already have started by the time we read this.
    expect(initialNum).toBeGreaterThan(0);
    expect(initialNum).toBeLessThanOrEqual(1000);

    // Wait 3 seconds and check score has decreased
    await page.waitForTimeout(3000);

    const laterValue = await scoreValue.textContent();
    console.log("Score value after 3s:", laterValue);
    const laterNum = parseInt(laterValue || "0");

    // Score should have decreased (be less than initial)
    expect(laterNum).toBeLessThan(initialNum);
    // Score decreases linearly over 60 seconds, so after 3s it should be ~950
    expect(laterNum).toBeGreaterThanOrEqual(900);
    expect(laterNum).toBeLessThanOrEqual(970);
  });

  test("debug: check console logs for timer events", async ({ page }) => {
    // Collect console messages
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
});
