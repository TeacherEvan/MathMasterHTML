// @ts-check
import { expect, test } from "@playwright/test";

const PROFILE_KEY = "mathmaster_player_profile_v1";

test.describe("Level select scoreboard", () => {
  test("renders persisted scoreboard stats from local player storage", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      if (!sessionStorage.getItem("scoreboard-seeded")) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: 2,
            name: "Player",
            levels: {
              beginner: {
                totalScore: 43210,
                bestProblemScore: 12345,
                lastProblemScore: 9000,
                problemsCompleted: 7,
                lastPlayed: Date.now(),
              },
            },
            overall: {
              totalScore: 43210,
              problemsCompleted: 7,
              lastPlayed: Date.now(),
            },
            updatedAt: Date.now(),
          }),
        );
        localStorage.setItem("mathmaster_problems_beginner", "7");
        sessionStorage.setItem("scoreboard-seeded", "1");
      }
    }, PROFILE_KEY);

    await page.goto("/level-select.html");

    const beginnerCard = page.locator('.level-card[data-level="beginner"]');
    await expect(beginnerCard.locator(".completion-stat .stat-value")).toHaveText(
      "7",
    );
    await expect(beginnerCard.locator(".best-score-stat .stat-value")).toHaveText(
      "12,345",
    );
    await expect(beginnerCard.locator(".total-score-stat .stat-value")).toHaveText(
      "43,210",
    );
  });

  test("migrates legacy player profiles and resets scoreboard with progress", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      if (!sessionStorage.getItem("legacy-scoreboard-seeded")) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            name: "Player",
            levels: {
              beginner: {
                totalScore: 5000,
                problemsCompleted: 2,
                lastPlayed: 1700000000000,
              },
            },
            updatedAt: 1700000000000,
          }),
        );
        localStorage.setItem(
          "mathmaster_console_beginner",
          JSON.stringify({ slots: ["1"] }),
        );
        localStorage.setItem("mathmaster_problems_beginner", "2");
        sessionStorage.setItem("legacy-scoreboard-seeded", "1");
      }
    }, PROFILE_KEY);

    await page.goto("/level-select.html");

    await expect(
      page.locator('.level-card[data-level="beginner"] .best-score-stat .stat-value'),
    ).toHaveText("0");
    await expect(
      page.locator('.level-card[data-level="beginner"] .total-score-stat .stat-value'),
    ).toHaveText("5,000");

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.click(".reset-progress-btn");
    await page.waitForLoadState("load");

    const storageState = await page.evaluate((storageKey) => ({
      consoleKey: localStorage.getItem("mathmaster_console_beginner"),
      progressKey: localStorage.getItem("mathmaster_problems_beginner"),
      profile: JSON.parse(localStorage.getItem(storageKey) || "null"),
    }), PROFILE_KEY);

    expect(storageState.consoleKey).toBeNull();
    expect(storageState.progressKey).toBeNull();
    expect(storageState.profile?.version).toBe(2);
    expect(storageState.profile?.levels).toEqual({});
  });
});
