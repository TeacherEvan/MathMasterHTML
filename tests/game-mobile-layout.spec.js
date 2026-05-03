import { expect, test } from "@playwright/test";

async function ensureLandscapeViewport(page) {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width >= viewport.height) {
    return;
  }

  await page.setViewportSize({
    width: viewport.height,
    height: viewport.width,
  });
}

test.describe("Gameplay mobile landscape layout", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !testInfo.project.use?.isMobile,
      "Mobile landscape layout contract runs on mobile projects only.",
    );

    await ensureLandscapeViewport(page);
  });

  test("keeps the gameplay chrome inside the viewport", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    const startButton = page.locator("#start-game-btn");
    if (await startButton.isVisible()) {
      await startButton.click({ force: true });
    }

    await page.waitForFunction(() => {
      const overlay = document.getElementById("rotation-overlay");
      return (
        document.body.classList.contains("viewport-compact") &&
        document.body.classList.contains("viewport-landscape") &&
        overlay &&
        window.getComputedStyle(overlay).display === "none"
      );
    });

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
          display: style.display,
          position: style.position,
          gridAutoFlow: style.gridAutoFlow,
          gridTemplateColumns: style.gridTemplateColumns,
          gridTemplateRows: style.gridTemplateRows,
          fontSize: Number.parseFloat(style.fontSize || "0"),
        };
      };

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        bodyClasses: document.body.className,
        activeResolution:
          window.displayManager?.getCurrentResolution?.()?.name ?? null,
        overlayDisplay: window.getComputedStyle(
          document.getElementById("rotation-overlay"),
        ).display,
        panelA: measure("#panel-a"),
        panelB: measure("#panel-b"),
        panelC: measure("#panel-c"),
        controls: measure(".panel-b-controls"),
        problem: measure("#problem-container"),
        solution: measure("#solution-container"),
        console: measure("#symbol-console"),
      };
    });

    expect(layout.bodyClasses).toContain("viewport-compact");
    expect(layout.activeResolution).toBe("mobile");
    expect(layout.overlayDisplay).toBe("none");
    expect(layout.panelA.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.panelB.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.panelC.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.panelB.left).toBeGreaterThan(layout.panelA.right - 2);
    expect(layout.panelC.left).toBeGreaterThan(layout.panelB.right - 2);
    expect(layout.controls.top).toBeGreaterThanOrEqual(0);
    expect(layout.problem.fontSize).toBeGreaterThanOrEqual(12);
    expect(layout.solution.fontSize).toBeGreaterThanOrEqual(10);
    expect(layout.console.display).toBe("grid");
    expect(layout.console.gridAutoFlow).toBe("column");
    expect(layout.console.position).toBe("relative");
    expect(layout.console.left).toBeGreaterThanOrEqual(layout.panelC.left - 1);
    expect(layout.console.right).toBeLessThanOrEqual(layout.panelC.right + 1);
    expect(layout.console.left - layout.panelC.left).toBeLessThanOrEqual(18);
    expect(layout.panelC.right - layout.console.right).toBeLessThanOrEqual(18);
    expect(layout.console.top).toBeGreaterThanOrEqual(layout.panelC.top - 1);
    expect(layout.console.bottom).toBeLessThanOrEqual(layout.panelC.bottom + 1);
  });
});
