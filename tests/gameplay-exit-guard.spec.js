import { expect, test } from "@playwright/test";

async function dispatchTouchEnd(page, selector) {
  await page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const touchEvent = new Event("touchend", {
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(touchEvent, "changedTouches", {
      configurable: true,
      value: [{ clientX: x, clientY: y }],
    });

    target.dispatchEvent(touchEvent);
    return true;
  }, selector);
}

test.describe("gameplay back button", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      }

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
    });
  });

  test("back button asks for confirmation and stays on the game when unresolved gameplay exit is dismissed", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#how-to-play-modal")).toBeVisible();
    await page.locator("#start-game-btn").click();
    await page.waitForTimeout(1500);

    let dialogSeen = false;
    page.once("dialog", async (dialog) => {
      dialogSeen = true;
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain("Leave this problem");
      await dialog.dismiss();
    });

    await page.click("#back-button");
    await page.waitForTimeout(400);

    expect(dialogSeen).toBe(true);
    await expect(page).toHaveURL(/src\/pages\/game\.html/);
  });

  test("back button exits after confirmation while gameplay is active and unresolved", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#how-to-play-modal")).toBeVisible();
    await page.locator("#start-game-btn").click();

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    await page.click("#back-button");
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/src\/pages\/game\.html/);
  });

  test("back button exits immediately without confirmation after problemCompleted fires", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#how-to-play-modal")).toBeVisible();
    await page.locator("#start-game-btn").click();
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PROBLEM_COMPLETED));
    });

    let dialogSeen = false;
    page.once("dialog", async (dialog) => {
      dialogSeen = true;
      await dialog.dismiss();
    });

    await page.click("#back-button");
    await page.waitForTimeout(400);
    expect(dialogSeen).toBe(false);
    await expect(page).not.toHaveURL(/src\/pages\/game\.html/);
  });

  test("back button honors touchend activation and exits after confirmation during unresolved gameplay", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#how-to-play-modal")).toBeVisible();
    await page.locator("#start-game-btn").click();

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    await dispatchTouchEnd(page, "#back-button");
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/src\/pages\/game\.html/);
  });
});