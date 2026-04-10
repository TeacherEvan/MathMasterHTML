// @ts-check
import { expect, test } from "@playwright/test";

function getWelcomeUrl() {
  return `/src/pages/index.html?welcome-motion-spec=${Date.now()}`;
}

/**
 * @param {import("@playwright/test").Page} page
 */
async function captureWelcomeMotionSnapshot(page) {
  return page.evaluate(() => {
    const title = document.querySelector(".main-title");
    const subtitle = document.querySelector(".subtitle");
    const logoCircle = document.querySelector(".logo-circle");
    const logoBeam = document.querySelector(".logo-beam");

    if (
      !(title instanceof HTMLElement) ||
      !(subtitle instanceof HTMLElement) ||
      !(logoCircle instanceof HTMLElement) ||
      !(logoBeam instanceof HTMLElement)
    ) {
      return null;
    }

    return {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      titleFilter: window.getComputedStyle(title).filter,
      titleShadow: window.getComputedStyle(title).textShadow,
      subtitleColor: window.getComputedStyle(subtitle).color,
      logoTransform: window.getComputedStyle(logoCircle).transform,
      logoShadow: window.getComputedStyle(logoCircle).boxShadow,
      logoBeamTransform: window.getComputedStyle(logoBeam).transform,
    };
  });
}

test.describe("Welcome page motion preferences", () => {
  test("keeps the hero stable and usable when reduced motion is enabled", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(getWelcomeUrl(), { waitUntil: "domcontentloaded" });

    const initialSnapshot = await captureWelcomeMotionSnapshot(page);

    expect(initialSnapshot).toBeTruthy();
    expect(initialSnapshot?.reducedMotion).toBe(true);

    await page.waitForTimeout(3200);

    const settledSnapshot = await captureWelcomeMotionSnapshot(page);
    expect(settledSnapshot).toEqual(initialSnapshot);

    await page.getByRole("button", { name: "Begin Training" }).click();
    await expect
      .poll(() => page.url())
      .toMatch(/\/src\/pages\/level-select\.html/);
  });
});
