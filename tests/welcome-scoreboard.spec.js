// @ts-check
import { expect, test } from "@playwright/test";

const PROFILE_KEY = "mathmaster_player_profile_v1";

test.describe("Welcome scoreboard", () => {
  test("renders aggregate stats and recent local history", async ({ page }) => {
    await page.addInitScript((storageKey) => {
      if (!sessionStorage.getItem("welcome-scoreboard-seeded")) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: 3,
            name: "Neo",
            levels: {
              beginner: {
                totalScore: 43210,
                bestProblemScore: 12345,
                lastProblemScore: 9000,
                problemsCompleted: 7,
                lastPlayed: 1735689600000,
              },
              warrior: {
                totalScore: 15000,
                bestProblemScore: 8000,
                lastProblemScore: 4000,
                problemsCompleted: 3,
                lastPlayed: 1735776000000,
              },
            },
            overall: {
              totalScore: 58210,
              problemsCompleted: 10,
              lastPlayed: 1735776000000,
            },
            recentHistory: [
              {
                levelKey: "warrior",
                score: 4000,
                completedAt: 1735776000000,
              },
              {
                levelKey: "beginner",
                score: 12345,
                completedAt: 1735689600000,
              },
            ],
            updatedAt: 1735776000000,
          }),
        );
        sessionStorage.setItem("welcome-scoreboard-seeded", "1");
      }
    }, PROFILE_KEY);

    await page.goto("/index.html");
    await page.click("#scoreboard-button");

    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);
    await expect(page.locator("#scoreboard-modal")).toBeVisible();
    await expect(page.locator("#scoreboard-player-name")).toHaveText("Neo");
    await expect(page.locator("#scoreboard-overall-summary")).toContainText(
      "58,210",
    );
    await expect(page.locator("#scoreboard-level-stats")).toContainText(
      "Beginner",
    );
    await expect(page.locator("#scoreboard-level-stats")).toContainText(
      "12,345",
    );
    await expect(page.locator("#scoreboard-history-list")).toContainText(
      "Warrior",
    );
    await expect(page.locator("#scoreboard-history-list")).toContainText(
      "4,000",
    );
  });

  test("shows an empty-state message when no scores are stored", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      localStorage.removeItem(storageKey);
    }, PROFILE_KEY);

    await page.goto("/index.html");
    await page.click("#scoreboard-button");

    await expect(page.locator("#scoreboard-modal")).toBeVisible();
    await expect(page.locator("#scoreboard-history-list")).toContainText(
      "No local score history yet",
    );
  });
});
