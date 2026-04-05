// @ts-check
import { expect, test } from "@playwright/test";

function getWelcomeUrl() {
  return `/src/pages/index.html?welcome-redesign-spec=${Date.now()}`;
}

test.describe("Welcome page redesign", () => {
  test("renders the operator-console hero structure and CTA", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);
    await expect(page).toHaveTitle("Math Master — Welcome");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#111714",
    );

    await expect(page.locator("header[role='banner'] .page-kicker")).toHaveText(
      "Training dossier",
    );
    await expect(page.locator("header[role='banner'] .main-title")).toHaveText(
      "MATH MASTER",
    );
    await expect(page.locator("header[role='banner'] .subtitle")).toHaveText(
      "Unlock Your Mind",
    );

    await expect(page.locator("main[role='main'] blockquote")).toContainText(
      "If it is not right, do not do it; if it is not true, do not say it.",
    );
    await expect(
      page.locator("main[role='main'] blockquote footer"),
    ).toContainText("Marcus Aurelius");

    const cta = page.getByRole("button", { name: "Begin Training" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("data-testid", "welcome-cta");

    await expect(page.locator(".logo-container figcaption")).toHaveText(
      "Math Master symbol: scale and variables",
    );

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const header = page.locator(".welcome-header");
    const title = page.locator(".welcome-header .main-title");
    const logoCircle = page.locator(".logo-circle");
    const quote = page.locator(".quote");
    const buttons = page.locator(".button-container");
    const hint = page.locator(".welcome-hint");
    const credit = page.locator(".creator-credit");
    const heroMain = page.locator("main[role='main']");

    const [
      headerBox,
      titleBox,
      logoBox,
      quoteBox,
      buttonsBox,
      hintBox,
      creditBox,
      heroMainBox,
    ] = await Promise.all([
      header.boundingBox(),
      title.boundingBox(),
      logoCircle.boundingBox(),
      quote.boundingBox(),
      buttons.boundingBox(),
      hint.boundingBox(),
      credit.boundingBox(),
      heroMain.boundingBox(),
    ]);

    const normalizeBox = (box) =>
      box
        ? {
            ...box,
            top: box.y,
            right: box.x + box.width,
            bottom: box.y + box.height,
            left: box.x,
          }
        : null;

    const normalizedTitleBox = normalizeBox(titleBox);
    const normalizedLogoBox = normalizeBox(logoBox);
    const normalizedQuoteBox = normalizeBox(quoteBox);
    const normalizedButtonsBox = normalizeBox(buttonsBox);
    const normalizedHintBox = normalizeBox(hintBox);
    const normalizedCreditBox = normalizeBox(creditBox);
    const normalizedHeroMainBox = normalizeBox(heroMainBox);

    expect(headerBox).toBeTruthy();
    expect(titleBox).toBeTruthy();
    expect(logoBox).toBeTruthy();
    expect(quoteBox).toBeTruthy();
    expect(buttonsBox).toBeTruthy();
    expect(hintBox).toBeTruthy();
    expect(creditBox).toBeTruthy();
    expect(heroMainBox).toBeTruthy();

    const logoShadow = await logoCircle.evaluate(
      (element) => window.getComputedStyle(element).boxShadow,
    );

    const viewportCenter = viewport.width / 2;
    const getCenter = (box) => box.x + box.width / 2;

    expect(
      Math.abs(getCenter(normalizedTitleBox) - viewportCenter),
    ).toBeLessThanOrEqual(32);
    expect(
      Math.abs(getCenter(normalizedLogoBox) - viewportCenter),
    ).toBeLessThanOrEqual(32);
    expect(
      Math.abs(getCenter(normalizedQuoteBox) - viewportCenter),
    ).toBeLessThanOrEqual(36);
    expect(normalizedHeroMainBox.bottom).toBeLessThanOrEqual(
      viewport.height + 24,
    );
    expect(
      normalizedQuoteBox.top - normalizedLogoBox.bottom,
    ).toBeGreaterThanOrEqual(20);
    expect(
      normalizedButtonsBox.top - normalizedQuoteBox.bottom,
    ).toBeGreaterThanOrEqual(16);
    expect(
      normalizedHintBox.top - normalizedButtonsBox.bottom,
    ).toBeGreaterThanOrEqual(16);
    expect(
      normalizedCreditBox.top - normalizedHintBox.bottom,
    ).toBeGreaterThanOrEqual(12);
    expect(normalizedLogoBox.width).toBeGreaterThanOrEqual(180);
    expect(logoShadow).not.toBe("none");
  });

  test("keeps scoreboard interactions local while navigation is restricted to the CTA", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    await expect(page.locator("#scoreboard-button")).toBeVisible();
    await page
      .locator("#scoreboard-button")
      .click({ force: true, noWaitAfter: true });
    await page.waitForFunction(() => {
      const modal = document.getElementById("scoreboard-modal");
      return Boolean(modal && modal.hidden === false);
    });
    await expect(page.locator("#scoreboard-modal")).toBeVisible();
    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);

    await page
      .locator("#scoreboard-close-button")
      .click({ force: true, noWaitAfter: true });
    await expect(page.locator("#scoreboard-modal")).toBeHidden();
    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);
  });

  test("navigates to level select on CTA click and keyboard activation", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    const cta = page.getByRole("button", { name: "Begin Training" });

    await cta.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.url())
      .toMatch(/\/src\/pages\/level-select\.html/);

    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);

    await expect(
      page.getByRole("button", { name: "Begin Training" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Begin Training" }).click();
    await expect
      .poll(() => page.url())
      .toMatch(/\/src\/pages\/level-select\.html/);
  });
});
