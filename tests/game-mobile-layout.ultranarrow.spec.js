import { expect, test } from "@playwright/test";

async function dismissBriefing(page) {
  const startButton = page.locator("#start-game-btn");
  const howToPlayModal = page.locator("#how-to-play-modal");

  await expect(startButton).toBeVisible({ timeout: 10000 });

  for (let attempt = 0; attempt < 4; attempt++) {
    await startButton.click({ force: true });

    try {
      await expect(howToPlayModal).toBeHidden({ timeout: 1500 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }
}

test.describe("Gameplay ultra-narrow embedded landscape layout", () => {
  test.use({
    viewport: { width: 294, height: 161 },
    screen: { width: 294, height: 161 },
  });

  test("keeps all three panels visible and the console horizontal inside panel B", async ({
    page,
  }) => {
    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    await dismissBriefing(page);

    await page.waitForFunction(() => {
      const overlay = document.getElementById("rotation-overlay");
      const intro = document.getElementById("how-to-play-modal");
      return (
        document.body.classList.contains("viewport-compact") &&
        document.body.classList.contains("viewport-landscape") &&
        overlay &&
        window.getComputedStyle(overlay).display === "none" &&
        intro &&
        window.getComputedStyle(intro).display === "none"
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
          overflowX: style.overflowX,
          overflowY: style.overflowY,
        };
      };

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        bodyClasses: document.body.className,
        activeResolution:
          window.displayManager?.getCurrentResolution?.()?.name ?? null,
        grid: measure(".grid-container"),
        panelA: measure("#panel-a"),
        panelB: measure("#panel-b"),
        panelC: measure("#panel-c"),
        console: measure("#symbol-console"),
        consoleSlot: measure(".console-slot"),
        help: measure("#help-button"),
        clarify: measure("#clarify-button"),
        back: measure("#back-button"),
        audio: measure("#audio-toggle"),
      };
    });

    expect(layout.bodyClasses).toContain("viewport-compact");
    expect(layout.activeResolution).toBe("mobile");
    expect(layout.grid.overflowY).not.toMatch(/auto|scroll/);
    expect(layout.panelB.left).toBeGreaterThan(layout.panelA.right - 2);
    expect(layout.panelC.left).toBeGreaterThan(layout.panelB.right - 2);
    expect(layout.panelA.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.panelB.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.panelC.bottom).toBeLessThanOrEqual(
      layout.viewport.height + 1,
    );
    expect(layout.console.position).toBe("absolute");
    expect(layout.console.gridAutoFlow).toBe("column");
    expect(layout.console.overflowX).toMatch(/auto|scroll/);
    expect(layout.console.left).toBeGreaterThanOrEqual(layout.panelB.left - 1);
    expect(layout.console.right).toBeLessThanOrEqual(layout.panelB.right + 1);
    expect(layout.consoleSlot.width).toBeGreaterThanOrEqual(44);
    expect(layout.consoleSlot.height).toBeGreaterThanOrEqual(44);
    expect(layout.help.height).toBeGreaterThanOrEqual(44);
    expect(layout.clarify.height).toBeGreaterThanOrEqual(44);
    expect(layout.back.height).toBeGreaterThanOrEqual(44);
    expect(layout.audio.height).toBeGreaterThanOrEqual(44);
    expect(layout.back.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.audio.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.back.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(layout.audio.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  });
});
