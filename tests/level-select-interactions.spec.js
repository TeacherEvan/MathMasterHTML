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

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} level
 */
async function clickCardBody(page, level) {
  const card = page.locator(`.level-card[data-level="${level}"]`);
  const ctaButton = card.locator(".level-button");

  if ((await card.count()) !== 1 || (await ctaButton.count()) !== 1) {
    throw new Error(`Could not resolve a stable body-click target for ${level}.`);
  }

  await card.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });

  const [cardBox, buttonBox] = await Promise.all([
    card.boundingBox(),
    ctaButton.boundingBox(),
  ]);

  if (!cardBox || !buttonBox) {
    throw new Error(`Could not resolve a stable body-click target for ${level}.`);
  }

  const buttonTopWithinCard = buttonBox.y - cardBox.y;
  const clickY = Math.max(
    24,
    Math.min(buttonTopWithinCard - 24, Math.round(buttonTopWithinCard * 0.5)),
  );

  if (clickY >= buttonTopWithinCard) {
    throw new Error(`Could not resolve a stable body-click target for ${level}.`);
  }

  await page.mouse.click(
    Math.round(cardBox.x + cardBox.width / 2),
    Math.round(cardBox.y + clickY),
  );
}

test.describe("Level select interactions", () => {
  test("does not launch a route when the panel body is clicked", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    await clickCardBody(page, "beginner");
    await expect(page).toHaveURL(/\/src\/pages\/level-select\.html(?:$|\?)/);
  });

  for (const route of ROUTES) {
    test(`launches ${route.level} only from its CTA button`, async ({ page }) => {
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);
      const button = page.getByRole("button", { name: route.buttonName });
      await button.evaluate((element) => {
        element.scrollIntoView({ block: "center", inline: "nearest" });
      });
      await button.click({ noWaitAfter: true });
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

  test("keeps CTA launch working with reduced motion enabled", async ({
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
      .click({ noWaitAfter: true });
    await expectRouteLaunch(page, "beginner");
  });
});
