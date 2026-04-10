// @ts-check
import { expect, test } from "@playwright/test";

const LEVEL_SELECT_URL = "/src/pages/level-select.html";
const ROUTES = [
  { key: "1", level: "beginner", buttonName: "Enter foundations" },
  { key: "2", level: "warrior", buttonName: "Enter mixed ops" },
  { key: "3", level: "master", buttonName: "Enter division" },
];

const DESKTOP_VIEWPORT = { width: 1440, height: 1100 };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const fakeRegistration = {
      scope: "/",
      waiting: null,
      installing: null,
      active: null,
      update: async () => {},
      addEventListener: () => {},
      unregister: async () => true,
    };

    try {
      navigator.serviceWorker.register = async () => fakeRegistration;
      navigator.serviceWorker.getRegistration = async () => null;
      navigator.serviceWorker.getRegistrations = async () => [];
    } catch {
      // Ignore environments that do not allow overriding these methods.
    }
  });
});

/**
 * @param {import("@playwright/test").Page} page
 */
async function useDesktopViewport(page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
}

/**
 * @param {import("@playwright/test").Page} page
 */
async function waitForCardsToSettle(page) {
  await page.waitForLoadState("load");
  await expect(page.locator(".level-card")).toHaveCount(3);
  await expect(page.locator(".level-button")).toHaveCount(3);
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} level
 */
async function waitForRouteButton(page, level) {
  const button = page.locator(
    `.level-card[data-level="${level}"] .level-button`,
  );

  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();

  return button;
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
  const levelButton = page.locator(
    `.level-card[data-level="${level}"] .level-button`,
  );
  const routeButton = page.locator(`.route-switcher-button[data-level="${level}"]`);
  const levelButtonVisible = await levelButton.isVisible().catch(() => false);

  if (levelButtonVisible) {
    return;
  }

  const routeVisible = await routeButton.isVisible().catch(() => false);

  if (!routeVisible) {
    return;
  }

  await routeButton.scrollIntoViewIfNeeded();
  await routeButton.click();
  await expect(routeButton).toHaveAttribute("aria-pressed", "true");
  await expect(levelButton).toBeVisible();
  await expect(levelButton).toBeEnabled();
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
    await useDesktopViewport(page);
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    await clickCardBody(page, "beginner");
    await expect(page).toHaveURL(/\/src\/pages\/level-select\.html(?:$|\?)/);
  });

  for (const route of ROUTES) {
    test(`launches ${route.level} only from its CTA button`, async ({ page }) => {
      await useDesktopViewport(page);
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);
      await switchCompactRouteIfNeeded(page, route.level);
      const button = await waitForRouteButton(page, route.level);
      await button.dispatchEvent("click");
      await expectRouteLaunch(page, route.level);
    });

    test(`launches ${route.level} from keyboard shortcut ${route.key}`, async ({
      page,
    }) => {
      await useDesktopViewport(page);
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);
      await waitForRouteButton(page, route.level);
      const routeSwitcherButton = page.locator(
        `.route-switcher-button[data-level="${route.level}"]`,
      );
      await routeSwitcherButton.focus();
      await routeSwitcherButton.press(route.key);
      await expectRouteLaunch(page, route.level);
    });
  }

  test("keeps CTA launch working with reduced motion enabled", async ({
    page,
  }) => {
    await useDesktopViewport(page);
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

  test("animates route progress with transforms instead of width changes", async ({
    page,
  }) => {
    await useDesktopViewport(page);
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await page.waitForFunction(() => {
      const progressBars = Array.from(document.querySelectorAll(".progress-fill"));
      return (
        progressBars.length === 3 &&
        progressBars.every((bar) =>
          typeof bar.style.transform === "string" &&
          bar.style.transform.startsWith("scaleX("),
        )
      );
    });

    const progressState = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".progress-fill")).map((bar) => ({
        transition: bar.style.transition,
        transform: bar.style.transform,
        width: bar.style.width,
      }));
    });

    expect(progressState.length).toBe(3);
    expect(progressState.every((bar) => bar.transition.includes("transform"))).toBe(true);
    expect(progressState.every((bar) => bar.transform.startsWith("scaleX("))).toBe(true);
    expect(progressState.every((bar) => bar.width === "")).toBe(true);
  });

  test("launches a focused CTA button with Enter", async ({ page }) => {
    await useDesktopViewport(page);
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    const button = page.getByRole("button", { name: "Enter foundations" });
    await button.focus();
    await expect(button).toBeFocused();
    await button.press("Enter");

    await expectRouteLaunch(page, "beginner");
  });

  test("switches compact routes with keyboard activation", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    const warriorRoute = page.locator('.route-switcher-button[data-level="warrior"]');
    await warriorRoute.focus();
    await expect(warriorRoute).toBeFocused();
    await warriorRoute.press("Space");

    await expect(warriorRoute).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.level-card[data-level="warrior"]')).toBeVisible();
  });

  test("returns to welcome from the back button with Enter", async ({ page }) => {
    await useDesktopViewport(page);
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    const backButton = page.getByRole("button", {
      name: "← Return to Welcome",
    });
    await backButton.focus();
    await expect(backButton).toBeFocused();
    await backButton.press("Enter");

    await expect(page).toHaveURL(/\/src\/pages\/index\.html(?:$|\?)/);
  });

  test("opens settings with Enter and closes them with Escape", async ({ page }) => {
    await useDesktopViewport(page);
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    const settingsButton = page.getByRole("button", { name: "Open settings" });
    await settingsButton.focus();
    await expect(settingsButton).toBeFocused();
    await settingsButton.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Game settings" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/src\/pages\/level-select\.html(?:$|\?)/);
  });

  for (const key of ["Escape", "Backspace"]) {
    test(`returns to welcome from keyboard back navigation with ${key}`, async ({
      page,
    }) => {
      await useDesktopViewport(page);
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);

      const backButton = page.getByRole("button", {
        name: "← Return to Welcome",
      });
      await backButton.focus();

      await backButton.press(key);

      await expect(page).toHaveURL(/\/src\/pages\/index\.html(?:$|\?)/);
    });
  }
});
