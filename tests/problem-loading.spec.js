import { expect, test } from "@playwright/test";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

test.describe("Problem loading display", () => {
  test("shows the active problem set while the fetch is pending", async ({
    page,
  }) => {
    let releaseProblemResponse;
    const problemResponseGate = new Promise((resolve) => {
      releaseProblemResponse = resolve;
    });

    await page.route("**/beginner_problems.json", async (route) => {
      const response = await route.fetch();
      await problemResponseGate;
      await route.fulfill({ response });
    });

    await gotoGameRuntime(page, "?level=beginner&preload=off");

    const loadingCard = page.locator(
      "#problem-container .loading-spinner-container--problem",
    );
    await expect(loadingCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#problem-container .loading-message")).toHaveText(
      /Loading beginner problem set/i,
    );
    await expect(page.locator("#problem-container .loading-message-detail")).toHaveText(
      /beginner_problems\.json/i,
    );

    releaseProblemResponse();

    await expect(page.locator("#problem-container .problem-text")).toBeVisible({
      timeout: 10000,
    });
  });
});
