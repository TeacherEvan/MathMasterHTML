import { expect, test } from "@playwright/test";

test.describe("single H2P routing", () => {
  test("first Beginner launch routes into the dedicated h2p level", async ({ page }) => {
    await page.goto("/src/pages/level-select.html", { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      localStorage.removeItem("mathmaster_onboarding_v1");
    });

    await page.click('[data-level="beginner"].level-button');
    await page.waitForURL(/src\/pages\/game\.html\?level=h2p/);
    await expect(page).toHaveURL(/level=h2p/);
  });

  test("Beginner launch returns to the normal beginner route after tutorial consumption", async ({ page }) => {
    await page.goto("/src/pages/level-select.html", { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      localStorage.setItem(
        "mathmaster_onboarding_v1",
        JSON.stringify({
          version: 1,
          sessionCount: 1,
          evanConsumed: { beginner: false, warrior: false, master: false },
          tutorialConsumed: true,
          installPromptDismissedAt: null,
          updatedAt: Date.now(),
        }),
      );
    });

    await page.click('[data-level="beginner"].level-button');
    await page.waitForURL(/src\/pages\/game\.html\?level=beginner/);
    await expect(page).toHaveURL(/level=beginner/);
  });
});