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

    await expect(page.locator(".welcome-stage__top .page-kicker")).toHaveText(
      "Training dossier",
    );
    await expect(page.locator(".welcome-stage__top .main-title")).toHaveText(
      "MATH MASTER",
    );
    await expect(page.locator(".welcome-stage__top .subtitle")).toHaveText(
      "Enter the training console",
    );
    await expect(page.locator(".quote .quote-label")).toHaveText(
      "Core principle",
    );

    await expect(page.locator("blockquote")).toContainText(
      "If it is not right, do not do it; if it is not true, do not say it.",
    );
    await expect(
      page.locator("blockquote footer"),
    ).toContainText("Marcus Aurelius");

    const cta = page.getByRole("button", { name: "Begin Training" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("data-testid", "welcome-cta");

    await expect(page.locator(".logo-container figcaption")).toHaveText(
      "Math Master symbol: scale and variables",
    );

    // Visual order check - simpler approach
    const boxes = await Promise.all([
      page.locator(".welcome-stage__top").boundingBox(),
      page.locator(".logo-circle").boundingBox(),
      page.locator(".quote").boundingBox(),
      page.locator(".welcome-actions").boundingBox(),
      page.locator(".welcome-hint").boundingBox(),
      page.locator(".creator-credit").boundingBox(),
    ]);

    boxes.forEach((box) => expect(box).not.toBeNull());
    // Visual order: header < logo < quote < buttons < hint < credit
    const header = boxes[0];
    const logo = boxes[1];
    const quote = boxes[2];
    const buttons = boxes[3];
    const hint = boxes[4];
    const credit = boxes[5];

    expect(header.y).toBeLessThan(logo.y);
    expect(logo.y).toBeLessThan(quote.y);
    expect(quote.y).toBeLessThan(buttons.y);
    expect(buttons.y).toBeLessThan(hint.y);
    expect(hint.y).toBeLessThan(credit.y);
  });

  test("opens scoreboard modal on scoreboard button click", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    const scoreboardButton = page.locator("#scoreboard-button");
    await expect(scoreboardButton).toBeVisible();
    await expect(scoreboardButton).toHaveAttribute("aria-haspopup", "dialog");

    await scoreboardButton.click();

    const modal = page.locator("#scoreboard-modal");
    await expect(modal).toBeVisible();
    await expect(modal).not.toHaveAttribute("hidden");

    const modalContent = page.locator(".scoreboard-modal-content");
    await expect(modalContent).toBeVisible();
    await expect(page.locator("#scoreboard-title")).toHaveText(
      "Welcome back, Player",
    );

    await expect(page.locator("#scoreboard-name-input")).toBeVisible();
    await expect(page.locator("#scoreboard-name-save")).toBeVisible();
  });

  test("keeps scoreboard interactions local while navigation is restricted to the CTA", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    const scoreboardButton = page.locator("#scoreboard-button");
    await scoreboardButton.click();

    const modal = page.locator("#scoreboard-modal");
    await expect(modal).toBeVisible();

    const nameInput = page.locator("#scoreboard-name-input");
    await nameInput.fill("TestPlayer");
    await page.locator("#scoreboard-name-save").click();

    await expect(page.locator("#scoreboard-name-feedback")).toContainText(
      "Saved on this device only",
    );

    await page.locator("#scoreboard-close-button").click();

    await expect(modal).toBeHidden();

    const cta = page.getByRole("button", { name: "Begin Training" });
    await expect(cta).toBeVisible();
  });

  test("navigates to level select on CTA click", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    const cta = page.getByRole("button", { name: "Begin Training" });
    await expect(cta).toBeVisible();

    // Click the CTA
    await cta.click();

    await expect(page).toHaveURL(/\/src\/pages\/level-select\.html/);
  });

  test("navigates to level select on CTA keyboard activation when focused", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    const cta = page.getByRole("button", { name: "Begin Training" });
    await expect(cta).toBeVisible();

    // Focus the CTA first, then press Enter
    await cta.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/src\/pages\/level-select\.html/);
  });

  test("allows vertical overflow instead of clipping the welcome shell on short screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 520 });
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    const overflowState = await page.evaluate(() => {
      const bodyStyle = window.getComputedStyle(document.body);
      const content = document.querySelector(".page-content");
      const contentStyle = content
        ? window.getComputedStyle(content)
        : null;

      return {
        bodyOverflowY: bodyStyle.overflowY,
        bodyOverflow: bodyStyle.overflow,
        contentOverflow: contentStyle?.overflow ?? null,
        contentMaxHeight: contentStyle?.maxHeight ?? null,
        contentScrollHeight: content?.scrollHeight ?? 0,
        contentClientHeight: content?.clientHeight ?? 0,
      };
    });

    // Body has overflow restriction for shell layout (hidden, auto, or scroll)
    expect(["hidden", "auto", "scroll"]).toContain(overflowState.bodyOverflowY);
    // Page content handles overflow
    expect(overflowState.contentOverflow).toBe("auto");
    // Content should be scrollable if it overflows
    expect(overflowState.contentScrollHeight).toBeGreaterThan(overflowState.contentClientHeight);

    const compactType = await page.evaluate(() => {
      const quote = document.querySelector(".quote p");
      const hint = document.querySelector(".welcome-hint");

      return {
        quoteFontSize: quote ? Number.parseFloat(window.getComputedStyle(quote).fontSize) : 0,
        hintFontSize: hint ? Number.parseFloat(window.getComputedStyle(hint).fontSize) : 0,
      };
    });

    expect(compactType.quoteFontSize).toBeGreaterThanOrEqual(11);
    expect(compactType.hintFontSize).toBeGreaterThanOrEqual(9);
    await expect(page.getByRole("button", { name: "Begin Training" })).toBeVisible();
  });
});