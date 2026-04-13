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
    await expect(loadingCard).toBeHidden({ timeout: 10000 });
    await expect
      .poll(async () =>
        page.locator("#problem-container").evaluate((element) => {
          return element.dataset.originalContent ?? null;
        }),
      )
      .toBe(null);
  });

  test("keeps generic loading helpers idempotent until hidden", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await page.waitForFunction(
      () => Boolean(window.UXModules?.LoadingStateManager),
      null,
      { timeout: 10000 },
    );

    const skeletonState = await page.evaluate(() => {
      const host = document.createElement("div");
      host.id = "loading-helper-test-host";
      host.innerHTML = "<span>Original skeleton content</span>";
      document.body.appendChild(host);

      const manager = window.UXModules.LoadingStateManager;
      manager.showLoadingSkeleton(host, "custom");
      const firstSnapshot = host.dataset.originalContent ?? null;
      manager.showLoadingSkeleton(host, "custom");
      const secondSnapshot = host.dataset.originalContent ?? null;
      const skeletonCount = host.querySelectorAll(".loading-skeleton").length;
      manager.hideLoadingSkeleton(host);

      const restoredMarkup = host.innerHTML;
      const restoredSnapshot = host.dataset.originalContent ?? null;
      host.remove();

      return {
        firstSnapshot,
        secondSnapshot,
        skeletonCount,
        restoredMarkup,
        restoredSnapshot,
      };
    });

    expect(skeletonState.firstSnapshot).toContain("Original skeleton content");
    expect(skeletonState.secondSnapshot).toBe(skeletonState.firstSnapshot);
    expect(skeletonState.skeletonCount).toBe(1);
    expect(skeletonState.restoredMarkup).toContain("Original skeleton content");
    expect(skeletonState.restoredSnapshot).toBe(null);

    const spinnerState = await page.evaluate(() => {
      const host = document.createElement("div");
      host.id = "loading-spinner-test-host";
      host.innerHTML = "<span>Original spinner content</span>";
      document.body.appendChild(host);

      const manager = window.UXModules.LoadingStateManager;
      manager.showLoadingSpinner(host, "Loading data...");
      const firstSnapshot = host.dataset.originalContent ?? null;
      const firstMessage =
        host.querySelector(".loading-message")?.textContent ?? null;
      manager.showLoadingSpinner(host, "Different message should not replace content");
      const secondSnapshot = host.dataset.originalContent ?? null;
      const secondMessage =
        host.querySelector(".loading-message")?.textContent ?? null;
      const spinnerCount = host.querySelectorAll(".loading-spinner-container").length;
      manager.hideLoadingSpinner(host);

      const restoredMarkup = host.innerHTML;
      const restoredSnapshot = host.dataset.originalContent ?? null;
      host.remove();

      return {
        firstSnapshot,
        firstMessage,
        secondSnapshot,
        secondMessage,
        spinnerCount,
        restoredMarkup,
        restoredSnapshot,
      };
    });

    expect(spinnerState.firstSnapshot).toContain("Original spinner content");
    expect(spinnerState.firstMessage).toBe("Loading data...");
    expect(spinnerState.secondSnapshot).toBe(spinnerState.firstSnapshot);
    expect(spinnerState.secondMessage).toBe("Loading data...");
    expect(spinnerState.spinnerCount).toBe(1);
    expect(spinnerState.restoredMarkup).toContain("Original spinner content");
    expect(spinnerState.restoredSnapshot).toBe(null);
  });
});
