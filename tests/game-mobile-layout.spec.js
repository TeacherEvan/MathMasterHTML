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
    expect(layout.panelB.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.panelC.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.controls.top).toBeGreaterThanOrEqual(0);
    expect(layout.problem.fontSize).toBeGreaterThanOrEqual(12);
    expect(layout.solution.fontSize).toBeGreaterThanOrEqual(10);
    expect(layout.console.display).toBe("grid");
    expect(layout.console.gridTemplateColumns).not.toBe("none");
    expect(layout.console.gridTemplateRows).not.toBe("none");
    expect(layout.console.top).toBeGreaterThanOrEqual(0);
    expect(layout.console.left).toBeGreaterThanOrEqual(layout.panelB.left - 1);
    expect(layout.console.right).toBeLessThanOrEqual(layout.panelB.right + 1);
    expect(layout.console.bottom).toBeLessThanOrEqual(layout.panelB.bottom + 1);
    expect(layout.console.right).toBeLessThanOrEqual(layout.viewport.width + 1);
  });

  test.describe("coarse-pointer compact CSS contract", () => {
    test.use({
      viewport: { width: 915, height: 540 },
      screen: { width: 915, height: 540 },
    });

    test("stacks panel B below panel A for compact landscape phones above the legacy height breakpoint", async ({
      page,
    }) => {
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
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            display: style.display,
            gridTemplateColumns: style.gridTemplateColumns,
          };
        };

        const grid = document.querySelector(".grid-container");
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          bodyClasses: document.body.className,
          activeResolution:
            window.displayManager?.getCurrentResolution?.()?.name ?? null,
          panelA: measure("#panel-a"),
          panelB: measure("#panel-b"),
          panelC: measure("#panel-c"),
          console: measure("#symbol-console"),
          gridTemplateRows: grid
            ? window.getComputedStyle(grid).gridTemplateRows
            : null,
          overlayDisplay: window.getComputedStyle(
            document.getElementById("rotation-overlay"),
          ).display,
        };
      });

      expect(layout.bodyClasses).toContain("viewport-compact");
      expect(layout.activeResolution).toBe("mobile");
      expect(layout.overlayDisplay).toBe("none");
      expect(layout.gridTemplateRows).not.toBe("1fr");
      expect(layout.panelB.top).toBeGreaterThanOrEqual(
        layout.panelA.bottom - 1,
      );
      expect(layout.panelA.top).toBeGreaterThanOrEqual(-1);
      expect(layout.panelA.left).toBeGreaterThanOrEqual(-1);
      expect(layout.panelA.bottom).toBeLessThanOrEqual(
        layout.viewport.height + 1,
      );
      expect(layout.panelB.left).toBeGreaterThanOrEqual(-1);
      expect(layout.panelB.bottom).toBeLessThanOrEqual(
        layout.viewport.height + 1,
      );
      expect(layout.panelC.left).toBeGreaterThan(layout.panelA.right);
      expect(layout.panelC.top).toBeGreaterThanOrEqual(-1);
      expect(layout.panelC.right).toBeLessThanOrEqual(
        layout.viewport.width + 1,
      );
      expect(layout.panelC.bottom).toBeLessThanOrEqual(
        layout.viewport.height + 1,
      );
      expect(layout.console.display).toBe("grid");
      expect(layout.console.gridTemplateColumns).not.toBe("none");
      expect(layout.console.left).toBeGreaterThanOrEqual(
        layout.panelB.left - 1,
      );
      expect(layout.console.right).toBeLessThanOrEqual(layout.panelB.right + 1);
      expect(layout.console.bottom).toBeLessThanOrEqual(
        layout.panelB.bottom + 1,
      );
    });
  });
});
