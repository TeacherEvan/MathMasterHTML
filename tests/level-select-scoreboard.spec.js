// @ts-check
import { expect, test } from "@playwright/test";

const PROFILE_KEY = "mathmaster_player_profile_v1";

test.describe("Level select scoreboard", () => {
  test("keeps the hero and route cards visually readable after polish", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/level-select.html");

    const header = page.locator(".header");
    const headerHint = page.locator(".header-hint");
    const headerSubtitle = page.locator(".level-select-subtitle");
    const levelsGrid = page.locator(".levels-grid");
    const beginnerCard = page.locator('.level-card[data-level="beginner"]');
    const warriorCard = page.locator('.level-card[data-level="warrior"]');
    const masterCard = page.locator('.level-card[data-level="master"]');

    await expect(page).toHaveTitle("Math Master — Level Select");
    await expect(header.locator(".page-kicker")).toHaveText("Training dossier");
    await expect(header.locator(".main-title")).toHaveText("MATH MASTER");
    await expect(header.locator(".subtitle")).toHaveText("Choose a route");
    await expect(headerSubtitle).toContainText("Three tracks. One keyboard.");

    await page.waitForFunction(() => {
      const cards = Array.from(document.querySelectorAll(".level-card"));
      if (cards.length !== 3) return false;

      return cards.every((card) => {
        const style = window.getComputedStyle(card);
        const opacity = Number.parseFloat(style.opacity || "1");
        const transform = style.transform;

        return (
          opacity >= 0.99 &&
          (transform === "none" ||
            /^matrix\(1, 0, 0, 1, 0(?:\.0+)?, 0(?:\.0+)?\)$/.test(transform))
        );
      });
    });

    const [
      headerBox,
      headerHintBox,
      levelsGridBox,
      beginnerBox,
      warriorBox,
      masterBox,
      headerTextAlign,
      hintJustifyContent,
    ] = await Promise.all([
      header.boundingBox(),
      headerHint.boundingBox(),
      levelsGrid.boundingBox(),
      beginnerCard.boundingBox(),
      warriorCard.boundingBox(),
      masterCard.boundingBox(),
      header.evaluate((element) => window.getComputedStyle(element).textAlign),
      headerHint.evaluate(
        (element) => window.getComputedStyle(element).justifyContent,
      ),
    ]);

    expect(headerBox).toBeTruthy();
    expect(headerHintBox).toBeTruthy();
    expect(levelsGridBox).toBeTruthy();
    expect(beginnerBox).toBeTruthy();
    expect(warriorBox).toBeTruthy();
    expect(masterBox).toBeTruthy();

    expect(headerTextAlign).toBe("center");
    expect(hintJustifyContent).toBe("center");
    expect(headerHintBox.width).toBeLessThanOrEqual(headerBox.width - 120);
    expect(beginnerBox.y - levelsGridBox.y).toBeLessThanOrEqual(12);
    expect(Math.abs(warriorBox.y - beginnerBox.y)).toBeLessThanOrEqual(24);
    expect(Math.abs(masterBox.y - beginnerBox.y)).toBeLessThanOrEqual(24);
    expect(
      Math.abs(beginnerBox.height - warriorBox.height),
    ).toBeLessThanOrEqual(48);
    expect(Math.abs(masterBox.height - warriorBox.height)).toBeLessThanOrEqual(
      48,
    );
  });

  test("stacks cleanly and preserves CTA clarity on narrow mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/level-select.html");

    const header = page.locator(".header");
    const levelsGrid = page.locator(".levels-grid");
    const cards = page.locator(".level-card");
    const firstCard = cards.nth(0);
    const secondCard = cards.nth(1);
    const cta = firstCard.locator(".level-button");

    const [
      headerTextAlign,
      gridTemplateColumns,
      firstCardBox,
      secondCardBox,
      ctaBox,
    ] = await Promise.all([
      header.evaluate((element) => window.getComputedStyle(element).textAlign),
      levelsGrid.evaluate(
        (element) => window.getComputedStyle(element).gridTemplateColumns,
      ),
      firstCard.boundingBox(),
      secondCard.boundingBox(),
      cta.boundingBox(),
    ]);

    expect(firstCardBox).toBeTruthy();
    expect(secondCardBox).toBeTruthy();
    expect(ctaBox).toBeTruthy();

    expect(headerTextAlign).toBe("center");
    expect(gridTemplateColumns).not.toContain(" ");
    expect(secondCardBox.y).toBeGreaterThanOrEqual(
      firstCardBox.y + firstCardBox.height,
    );
    expect(ctaBox.width).toBeGreaterThanOrEqual(firstCardBox.width - 56);
  });

  test("renders persisted scoreboard stats from local player storage", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      if (!sessionStorage.getItem("scoreboard-seeded")) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: 3,
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
            recentHistory: [
              {
                levelKey: "beginner",
                score: 12345,
                completedAt: Date.now(),
              },
            ],
            updatedAt: Date.now(),
          }),
        );
        localStorage.setItem("mathmaster_problems_beginner", "7");
        sessionStorage.setItem("scoreboard-seeded", "1");
      }
    }, PROFILE_KEY);

    await page.goto("/level-select.html");

    const beginnerCard = page.locator('.level-card[data-level="beginner"]');
    await expect(
      beginnerCard.locator(".completion-stat .stat-value"),
    ).toHaveText("7");
    await expect(
      beginnerCard.locator(".best-score-stat .stat-value"),
    ).toHaveText("12,345");
    await expect(
      beginnerCard.locator(".total-score-stat .stat-value"),
    ).toHaveText("43,210");
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
      page.locator(
        '.level-card[data-level="beginner"] .best-score-stat .stat-value',
      ),
    ).toHaveText("0");
    await expect(
      page.locator(
        '.level-card[data-level="beginner"] .total-score-stat .stat-value',
      ),
    ).toHaveText("5,000");

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.click(".reset-progress-btn");
    await page.waitForLoadState("load");

    const storageState = await page.evaluate(
      (storageKey) => ({
        consoleKey: localStorage.getItem("mathmaster_console_beginner"),
        progressKey: localStorage.getItem("mathmaster_problems_beginner"),
        profile: JSON.parse(localStorage.getItem(storageKey) || "null"),
      }),
      PROFILE_KEY,
    );

    expect(storageState.consoleKey).toBeNull();
    expect(storageState.progressKey).toBeNull();
    expect(storageState.profile?.version).toBe(3);
    expect(storageState.profile?.levels).toEqual({});
    expect(storageState.profile?.recentHistory).toEqual([]);
  });
});
