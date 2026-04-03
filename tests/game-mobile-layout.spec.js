import { devices, expect, test } from "@playwright/test";

test.use({
  ...devices["Pixel 7"],
  viewport: { width: 915, height: 412 },
  screen: { width: 915, height: 412 },
});

test.describe("Gameplay mobile landscape layout", () => {
  test("keeps the gameplay chrome inside the viewport", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    const startButton = page.locator("#start-game-btn");
    if (await startButton.isVisible()) {
      await startButton.click({ force: true });
    }

    await page.waitForTimeout(1000);

    const layout = await page.evaluate(() => {
      const measure = (selector) => {
        const element = document.querySelector(selector);
        if (!element) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          selector,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          fontSize: Number.parseFloat(style.fontSize || "0"),
        };
      };

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        overlayDisplay: window.getComputedStyle(
          document.getElementById("rotation-overlay"),
        ).display,
        panelB: measure("#panel-b"),
        panelC: measure("#panel-c"),
        controls: measure(".panel-b-controls"),
        problem: measure("#problem-container"),
        solution: measure("#solution-container"),
        console: measure("#symbol-console"),
      };
    });

    expect(layout.overlayDisplay).toBe("none");
    expect(layout.panelB.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(layout.panelC.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(layout.controls.top).toBeGreaterThanOrEqual(0);
    expect(layout.problem.fontSize).toBeGreaterThanOrEqual(12);
    expect(layout.solution.fontSize).toBeGreaterThanOrEqual(10);
    expect(layout.console.top).toBeGreaterThanOrEqual(0);
    expect(layout.console.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(layout.console.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.console.left).toBeGreaterThanOrEqual(-1);
  });
});
