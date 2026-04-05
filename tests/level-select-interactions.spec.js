// @ts-check
import { expect, test } from "@playwright/test";

const LEVEL_SELECT_URL = "/src/pages/level-select.html";
const ROUTES = [
  { key: "1", level: "beginner", buttonName: "Enter foundations" },
  { key: "2", level: "warrior", buttonName: "Enter mixed ops" },
  { key: "3", level: "master", buttonName: "Enter division" },
];

/**
 * @param {import("@playwright/test").Page} page
 */
async function waitForCardsToSettle(page) {
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
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} level
 */
async function expectRouteLaunch(page, level) {
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}?level=${url.searchParams.get("level") || ""}`;
    })
    .toBe(`/src/pages/game.html?level=${level}`);
}

test.describe("Level select interactions", () => {
  for (const route of ROUTES) {
    test(`launches ${route.level} from a card click`, async ({ page }) => {
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);
      const button = page.getByRole("button", { name: route.buttonName });
      await button.scrollIntoViewIfNeeded();
      await button.click({ force: true, noWaitAfter: true });
      await expectRouteLaunch(page, route.level);
    });

    test(`launches ${route.level} from keyboard shortcut ${route.key}`, async ({
      page,
    }) => {
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);
      await page.keyboard.press(route.key);
      await expectRouteLaunch(page, route.level);
    });
  }

  test("keeps route cards visible and usable with reduced motion enabled", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await page.waitForFunction(() => {
      const cards = Array.from(document.querySelectorAll(".level-card"));
      const progressBars = Array.from(
        document.querySelectorAll(".progress-fill"),
      );

      return (
        cards.length === 3 &&
        progressBars.length === 3 &&
        cards.every((card) => {
          const style = window.getComputedStyle(card);
          return style.opacity === "1" && style.transform === "none";
        }) &&
        progressBars.every((bar) => bar.style.transition === "none")
      );
    });

    await page
      .getByRole("button", { name: "Enter foundations" })
      .click({ force: true, noWaitAfter: true });
    await expectRouteLaunch(page, "beginner");
  });
});
