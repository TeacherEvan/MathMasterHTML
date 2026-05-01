import { expect, test } from "@playwright/test";

async function dismissBriefing(page) {
  const startButton = page.locator("#start-game-btn");
  const howToPlayModal = page.locator("#how-to-play-modal");

  await page.waitForFunction(
    () => {
      const modal = document.getElementById("how-to-play-modal");
      const start = document.getElementById("start-game-btn");
      const modalVisible = Boolean(
        modal && window.getComputedStyle(modal).display !== "none",
      );
      const startVisible = Boolean(
        start &&
          window.getComputedStyle(start).display !== "none" &&
          start.getClientRects().length > 0,
      );
      const gameplayReady =
        window.GameRuntimeCoordinator?.isGameplayReady?.() === true;

      return gameplayReady || (modalVisible && startVisible);
    },
    { timeout: 10000 },
  );

  const briefingState = await page.evaluate(() => {
    const modal = document.getElementById("how-to-play-modal");
    return {
      modalVisible: Boolean(
        modal && window.getComputedStyle(modal).display !== "none",
      ),
      gameplayReady: window.GameRuntimeCoordinator?.isGameplayReady?.() === true,
    };
  });

  if (briefingState.gameplayReady && !briefingState.modalVisible) {
    return;
  }

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
          transform: style.transform,
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
        solution: measure("#solution-container"),
        console: measure("#symbol-console"),
        consoleSlot: measure(".console-slot"),
        help: measure("#help-button"),
        clarify: measure("#clarify-button"),
        back: measure("#back-button"),
        audio: measure("#audio-toggle"),
        solutionPaddingTop: Number.parseFloat(
          window.getComputedStyle(document.querySelector("#solution-container"))
            .paddingTop,
        ),
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
    expect(layout.console.position).toBe("relative");
    expect(layout.console.gridAutoFlow).toBe("column");
    expect(layout.console.overflowX).toMatch(/auto|scroll/);
    expect(layout.console.left).toBeGreaterThanOrEqual(layout.panelB.left - 1);
    expect(layout.console.right).toBeLessThanOrEqual(layout.panelB.right + 1);
    expect(Math.abs(layout.console.left - layout.panelB.left)).toBeLessThanOrEqual(
      10,
    );
    expect(Math.abs(layout.panelB.right - layout.console.right)).toBeLessThanOrEqual(
      10,
    );
    expect(layout.console.top).toBeGreaterThanOrEqual(layout.help.bottom - 2);
    expect(Math.abs(layout.help.bottom - layout.clarify.bottom)).toBeLessThanOrEqual(
      8,
    );
    expect(layout.solution.top).toBeGreaterThanOrEqual(layout.console.bottom - 2);
    expect(layout.solutionPaddingTop).toBeLessThanOrEqual(1);
    expect(layout.consoleSlot.width).toBeGreaterThanOrEqual(44);
    expect(layout.consoleSlot.height).toBeGreaterThanOrEqual(44);
    expect(layout.help.height).toBeGreaterThanOrEqual(44);
    expect(layout.clarify.height).toBeGreaterThanOrEqual(44);
    expect(layout.help.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.clarify.right).toBeLessThanOrEqual(
      layout.viewport.width + 1,
    );
    expect(Math.abs(layout.help.top - layout.clarify.top)).toBeLessThanOrEqual(
      8,
    );
    expect(layout.back.height).toBeGreaterThanOrEqual(44);
    expect(layout.audio.height).toBeGreaterThanOrEqual(44);
    expect(layout.back.transform).toBe("none");
    expect(layout.audio.transform).toBe("none");
    expect(layout.back.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.audio.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.back.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(layout.audio.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  });
});
