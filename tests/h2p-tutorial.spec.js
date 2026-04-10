import { expect, test } from "@playwright/test";
import { installRectTarget } from "./utils/evan-target-fixtures.js";
import { dismissBriefingAndWaitForInteractiveGameplay } from "./utils/onboarding-runtime.js";

test("h2p forces Evan through worm, muffin, power-up, and symbol beats", async ({ page }) => {
  await page.goto("/src/pages/game.html?level=h2p&evan=auto&preload=off", {
    waitUntil: "domcontentloaded",
  });

  await installRectTarget(page, "worm-segment");
  await installRectTarget(page, "muffin");
  await installRectTarget(page, "symbol", "x");

  await page.evaluate(() => {
    window.__evanActions = [];
    document.addEventListener(window.GameEvents.EVAN_ACTION_COMPLETED, (event) => {
      window.__evanActions.push(event.detail?.action);
    });
  });

  await dismissBriefingAndWaitForInteractiveGameplay(page);
  await page.waitForFunction(() => {
    const actions = window.__evanActions || [];
    return actions.includes("wormTap") && actions.includes("muffinCollect");
  });

  const actions = await page.evaluate(() => window.__evanActions);
  expect(actions).toContain("wormTap");
  expect(actions).toContain("muffinCollect");
});