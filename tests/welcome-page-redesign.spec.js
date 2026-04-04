// @ts-check
import { expect, test } from "@playwright/test";

function getWelcomeUrl() {
  return `/index.html?welcome-redesign-spec=${Date.now()}`;
}

test.describe("Welcome page redesign", () => {
  test("renders the operator-console hero structure and CTA", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl());

    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);
    await expect(page).toHaveTitle("Math Master — Welcome");
    await expect(
      page.locator('meta[name="theme-color"]'),
    ).toHaveAttribute("content", "#111714");

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
  });

  test("keeps scoreboard interactions local while navigation is restricted to the CTA", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl());

    await page.click("#scoreboard-button");
    await expect(page.locator("#scoreboard-modal")).toBeVisible();
    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);

    await page.mouse.click(24, 24);
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/src\/pages\/index\.html/);
  });

  test("navigates to level select on CTA click and keyboard activation", async ({
    page,
  }) => {
    await page.goto(getWelcomeUrl());

    const cta = page.getByRole("button", { name: "Begin Training" });

    await cta.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/src\/pages\/level-select\.html/);

    await page.goBack();
    await page.waitForURL(/\/src\/pages\/index\.html/);

    await page.getByRole("button", { name: "Begin Training" }).click();
    await page.waitForURL(/\/src\/pages\/level-select\.html/);
  });
});
