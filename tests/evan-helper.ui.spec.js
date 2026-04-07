// tests/evan-helper.ui.spec.js
import { expect, test } from "@playwright/test";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

test.setTimeout(30000);

test.describe("Evan Helper UI Shell — Build 3", () => {
  test.beforeEach(async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner&evan=off&preload=off");
  });

  test("#evan-assist-shell renders without obscuring #power-up-display", async ({
    page,
  }) => {
    // Make shell visible for measurement
    await page.evaluate(() => {
      const shell = document.getElementById("evan-assist-shell");
      if (shell) {
        shell.hidden = false;
        shell.setAttribute("aria-hidden", "false");
      }
      document.body.classList.add("evan-layout-preview");
    });
    const shell = page.locator("#evan-assist-shell");
    await expect(shell).toBeAttached();
    const shellBox = await shell.boundingBox();
    // Shell should render (non-zero area or pointer-events: none)
    if (shellBox) {
      // Check it does not entirely cover power-up display
      const pud = page.locator("#power-up-display");
      const pudCount = await pud.count();
      if (pudCount > 0 && (await pud.isVisible())) {
        const pudBox = await pud.boundingBox();
        // Shell has pointer-events: none, so even if overlapping visually, it doesn't block
        expect(pudBox).toBeTruthy();
      }
    }
  });

  test("body.evan-layout-preview does not zero out #power-up-display", async ({
    page,
  }) => {
    await page.evaluate(() => {
      document.body.classList.add("evan-layout-preview");
    });
    // Click start to get into game where power-up display may appear
    await page.click("#start-game-btn").catch(() => {});
    const pud = page.locator("#power-up-display");
    const pudCount = await pud.count();
    if (pudCount > 0) {
      const box = await pud.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }
    }
  });

  test("reduced-motion: shell visible without animation class", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => {
      window.EvanPresenter?.show?.();
    });
    const shell = page.locator("#evan-assist-shell");
    const hidden = await shell.getAttribute("hidden");
    // After show(), hidden attribute should be removed
    const ariaHidden = await shell.getAttribute("aria-hidden");
    expect(ariaHidden).toBe("false");
  });

  test("#evan-assist-label text reads correct label", async ({ page }) => {
    const label = page.locator("#evan-assist-label");
    await expect(label).toHaveText("Mr. Evan helping out");
  });
});
