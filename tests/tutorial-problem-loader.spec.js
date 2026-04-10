import { expect, test } from "@playwright/test";

test("h2p level loads a dedicated tutorial problem source", async ({ page }) => {
  await page.goto("/src/pages/game.html?level=h2p&evan=force&preload=off", {
    waitUntil: "domcontentloaded",
  });

  const onboarding = await page.evaluate(() => window.GameOnboarding);
  expect(onboarding.level).toBe("h2p");
});