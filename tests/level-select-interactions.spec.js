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
  await expect(page.locator(".level-card")).toHaveCount(3);
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
async function switchCompactRouteIfNeeded(page, level) {
  const routeButton = page.locator(`.route-switcher-button[data-level="${level}"]`);
  const routeVisible = await routeButton.isVisible().catch(() => false);

  if (!routeVisible) {
    return;
  }

  await routeButton.click();
  await expect(routeButton).toHaveAttribute("aria-pressed", "true");
}

test.describe("Level select interactions", () => {
  test("does not launch a route when the panel body is clicked", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    await page
      .locator('.level-card[data-level="beginner"] .level-description')
      .click({ force: true });

    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/src\/pages\/level-select\.html(?:$|\?)/);
  });

  for (const route of ROUTES) {
    test(`launches ${route.level} only from its CTA button`, async ({ page }) => {
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);
      await switchCompactRouteIfNeeded(page, route.level);
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
      .click({ force: true, noWaitAfter: true });
    await expectRouteLaunch(page, "beginner");
  });

  test("launches a focused CTA button with Enter", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    const button = page.getByRole("button", { name: "Enter foundations" });
    await button.focus();
    await page.keyboard.press("Enter");

    await expectRouteLaunch(page, "beginner");
  });

  test("switches compact routes with keyboard activation", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    const warriorRoute = page.locator('.route-switcher-button[data-level="warrior"]');
    await warriorRoute.focus();
    await page.keyboard.press("Space");

    await expect(warriorRoute).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.level-card[data-level="warrior"]')).toBeVisible();
  });

  test("returns to welcome from the back button with Enter", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    const backButton = page.getByRole("button", {
      name: "← Return to Welcome",
    });
    await backButton.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/src\/pages\/index\.html(?:$|\?)/);
  });
});
