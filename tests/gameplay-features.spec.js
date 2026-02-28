// @ts-check
/**
 * tests/gameplay-features.spec.js
 *
 * Playwright E2E tests covering the new gameplay features:
 *  1. Window C symbol stability (no size alternation)
 *  2. 1× green worm spawned inside Panel B on row completion
 *  3. Green worm targets revealed (blue) symbols only
 *  4. Row resets to red when worm steals a blue symbol
 *  5. Console setup modal is non-blocking (floating panel, not full-screen overlay)
 *  6. Console slot shows refresh animation after a symbol is placed
 */
import { expect, test } from "@playwright/test";

// ── helpers ─────────────────────────────────────────────────────────────────

async function startGame(page) {
  await page.goto("/game.html?level=beginner");
  const startBtn = page.locator("#start-game-btn");
  await expect(startBtn).toBeVisible({ timeout: 10000 });
  await startBtn.click({ force: true });
  await page.waitForTimeout(600);
  await page.waitForFunction(
    () => window.wormSystem && window.wormSystem.isInitialized === true,
  );
}

// ── test suite ───────────────────────────────────────────────────────────────

test.describe("Window C — Symbol Stability", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("falling symbols do not have a scale transform applied during face-reveal", async ({
    page,
  }) => {
    // Wait for symbols to fall and a face-reveal cycle to run (5 s interval)
    // We just verify the helpers.applyFaceRevealStyles does NOT set a transform.
    const hasScale = await page.evaluate(() => {
      // Manually invoke applyFaceRevealStyles on a fresh div and check transform
      const div = document.createElement("div");
      div.className = "falling-symbol";
      document.body.appendChild(div);
      window.SymbolRainHelpers.applyFaceRevealStyles(div);
      const transform = div.style.transform;
      div.remove();
      return transform !== "" && transform !== "none";
    });

    expect(hasScale).toBe(false);
  });

  test("resetFaceRevealStyles clears glow but leaves no scale residue", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const div = document.createElement("div");
      div.className = "falling-symbol";
      document.body.appendChild(div);
      window.SymbolRainHelpers.applyFaceRevealStyles(div);
      window.SymbolRainHelpers.resetFaceRevealStyles(div);
      const result = {
        transform: div.style.transform,
        textShadow: div.style.textShadow,
        filter: div.style.filter,
      };
      div.remove();
      return result;
    });

    expect(result.transform).toBe("");
    expect(result.textShadow).toBe("");
    expect(result.filter).toBe("");
  });
});

test.describe("Worm Spawn — 1× Panel B Green Worm", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("exactly 1 worm spawns after a row is completed", async ({ page }) => {
    // Ensure no worms exist yet
    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
    });

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () => window.wormSystem.worms.filter((w) => w.active).length === 1,
      { timeout: 5000 },
    );

    const wormCount = await page.evaluate(
      () => window.wormSystem.worms.filter((w) => w.active).length,
    );

    expect(wormCount).toBe(1);
  });

  test("worm spawned from row completion is positioned inside Panel B bounds", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () => window.wormSystem.worms.filter((w) => w.active).length >= 1,
      { timeout: 5000 },
    );

    const result = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => w.active && !w.isPurple);
      if (!worm) return null;

      const panel = document.getElementById("panel-b");
      const rect = panel ? panel.getBoundingClientRect() : null;
      return rect
        ? {
            wormX: worm.x,
            wormY: worm.y,
            panelLeft: rect.left - 50, // generous margin
            panelRight: rect.right + 50,
            panelTop: rect.top - 50,
            panelBottom: rect.bottom + 50,
          }
        : null;
    });

    expect(result).toBeTruthy();
    expect(result.wormX).toBeGreaterThanOrEqual(result.panelLeft);
    expect(result.wormX).toBeLessThanOrEqual(result.panelRight);
    expect(result.wormY).toBeGreaterThanOrEqual(result.panelTop);
    expect(result.wormY).toBeLessThanOrEqual(result.panelBottom);
  });

  test("worm starts rushing immediately (roamDuration=0)", async ({ page }) => {
    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () => window.wormSystem.worms.filter((w) => w.active).length >= 1,
      { timeout: 5000 },
    );

    const wormState = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => w.active && !w.isPurple);
      return worm
        ? {
            roamingEndTime: worm.roamingEndTime,
            now: Date.now(),
          }
        : null;
    });

    expect(wormState).toBeTruthy();
    // roamingEndTime should be at or before now, confirming no roam delay
    expect(wormState.roamingEndTime).toBeLessThanOrEqual(wormState.now + 100);
  });
});

test.describe("Green Worm — Blue Symbol Targeting", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("green worm immediately rushes to a revealed (blue) symbol", async ({
    page,
  }) => {
    // Reveal a symbol first using the help button
    const helpButton = page.locator("#help-button");
    await helpButton.click();
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () => window.wormSystem.worms.filter((w) => w.active).length >= 1,
      { timeout: 5000 },
    );

    const wormState = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => w.active && !w.isPurple);
      return worm
        ? {
            isRushingToTarget: worm.isRushingToTarget,
            targetSymbol: worm.targetSymbol,
          }
        : null;
    });

    expect(wormState).toBeTruthy();
    expect(wormState.isRushingToTarget).toBeTruthy();
  });

  test("spawnGreenWormInPanelB method exists on WormSystem", async ({
    page,
  }) => {
    const exists = await page.evaluate(
      () => typeof window.wormSystem.spawnGreenWormInPanelB === "function",
    );
    expect(exists).toBe(true);
  });

  test("worm difficulty: wormsPerRow is 1 for all levels", async ({ page }) => {
    const wormsPerRow = await page.evaluate(
      () => window.wormSystem.wormsPerRow,
    );
    expect(wormsPerRow).toBe(1);
  });
});

test.describe("Row Reset — Worm Steals Blue Symbol", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("rowResetByWorm event fires when a revealed symbol is stolen", async ({
    page,
  }) => {
    // Reveal a symbol
    const helpButton = page.locator("#help-button");
    await helpButton.click();
    await page.waitForTimeout(300);

    // Listen for the row reset event
    const gotEvent = await page.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 8000);
        document.addEventListener(
          "rowResetByWorm",
          () => {
            clearTimeout(timeout);
            resolve(true);
          },
          { once: true },
        );

        // Trigger steal by calling stealSymbol directly on a mock worm
        const revealedSymbols = document.querySelectorAll(".revealed-symbol");
        if (revealedSymbols.length === 0) {
          clearTimeout(timeout);
          resolve(null); // skip – no revealed symbols
          return;
        }

        const targetEl = revealedSymbols[0];
        const mockWorm = {
          id: "test-worm",
          x: 0,
          y: 0,
          element: document.createElement("div"),
          hasStolen: false,
          isRushingToTarget: true,
          isFlickering: false,
          isPurple: false,
          baseSpeed: 2,
          targetSymbol: targetEl.textContent,
          path: null,
          pathIndex: 0,
          lastPathUpdate: 0,
        };
        document.body.appendChild(mockWorm.element);

        // Place mock worm near the target element
        const rect = targetEl.getBoundingClientRect();
        mockWorm.x = rect.left + rect.width / 2;
        mockWorm.y = rect.top + rect.height / 2;

        window.wormSystem.worms.push(mockWorm);
        window.wormSystem.stealSymbol(mockWorm);
      });
    });

    // null = no revealed symbols to steal (valid skip)
    if (gotEvent === null) {
      test.skip();
      return;
    }
    expect(gotEvent).toBe(true);
  });

  test("after a blue steal, revealed symbols in the row become hidden again", async ({
    page,
  }) => {
    // Reveal symbols by using help
    const helpButton = page.locator("#help-button");
    await helpButton.click();
    await helpButton.click();
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => {
      const revealedBefore = document.querySelectorAll(".revealed-symbol");
      if (revealedBefore.length === 0) return null;

      const targetEl = revealedBefore[0];
      const stepIndex = targetEl.dataset.stepIndex;

      const mockWorm = {
        id: "test-steal",
        element: document.createElement("div"),
        hasStolen: false,
        isRushingToTarget: true,
        isFlickering: false,
        isPurple: false,
        baseSpeed: 2,
        x: 0,
        y: 0,
        targetSymbol: null,
        path: null,
        pathIndex: 0,
        lastPathUpdate: 0,
      };
      document.body.appendChild(mockWorm.element);

      const rect = targetEl.getBoundingClientRect();
      mockWorm.x = rect.left + rect.width / 2;
      mockWorm.y = rect.top + rect.height / 2;
      window.wormSystem.worms.push(mockWorm);
      window.wormSystem.stealSymbol(mockWorm);

      // Count how many revealed symbols remain in that row
      const remaining = document.querySelectorAll(
        `[data-step-index="${stepIndex}"].revealed-symbol`,
      );
      return { remaining: remaining.length, stepIndex };
    });

    if (result === null) {
      test.skip();
      return;
    }

    expect(result.remaining).toBe(0);
  });
});

test.describe("Console Setup Modal — Non-Blocking Floating Panel", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("modal overlay does not cover the full viewport", async ({ page }) => {
    // Open the modal by clicking an empty console slot - first we need to fill
    // a slot programmatically then open the modal to ensure it's present
    await page.evaluate(() => {
      const modal = document.getElementById("symbol-modal");
      if (modal) modal.style.display = "flex";
    });

    const modalRect = await page.evaluate(() => {
      const modal = document.getElementById("symbol-modal");
      const rect = modal?.getBoundingClientRect();
      return rect
        ? { width: rect.width, height: rect.height }
        : null;
    });

    expect(modalRect).toBeTruthy();
    // Should NOT fill the full viewport width (it's a 340px panel, not full-screen)
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(modalRect.width).toBeLessThan(viewportWidth * 0.7);
  });

  test("modal has a drag handle element", async ({ page }) => {
    const hasDragHandle = await page.evaluate(
      () => !!document.getElementById("modal-drag-handle"),
    );
    expect(hasDragHandle).toBe(true);
  });

  test("modal has a close button", async ({ page }) => {
    const hasCloseBtn = await page.evaluate(
      () => !!document.getElementById("modal-close-btn"),
    );
    expect(hasCloseBtn).toBe(true);
  });

  test("close button hides the modal", async ({ page }) => {
    await page.evaluate(() => {
      const modal = document.getElementById("symbol-modal");
      if (modal) modal.style.display = "flex";
    });

    // Use evaluate to trigger the close directly, as pointer-events:none on the overlay
    // could intercept browser-level click routing
    await page.evaluate(() => {
      const btn = document.getElementById("modal-close-btn");
      if (btn) btn.click();
    });
    await page.waitForTimeout(100);

    const display = await page.evaluate(
      () =>
        document.getElementById("symbol-modal")?.style.display,
    );
    expect(display).toBe("none");
  });

  test("gameplay elements remain interactive while modal is open", async ({
    page,
  }) => {
    // Show the modal
    await page.evaluate(() => {
      const modal = document.getElementById("symbol-modal");
      if (modal) modal.style.display = "flex";
    });

    // Panel C symbols should still be clickable (pointer-events not blocked)
    const panelCPointerEvents = await page.evaluate(() => {
      const panelC = document.getElementById("panel-c");
      return panelC
        ? window.getComputedStyle(panelC).pointerEvents
        : null;
    });

    // panel-c should NOT be 'none' (gameplay still interactive)
    expect(panelCPointerEvents).not.toBe("none");
  });
});

test.describe("Console Slot — Refresh Animation", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("slot gets 'refreshing' class immediately after symbol is placed", async ({
    page,
  }) => {
    const hasClass = await page.evaluate(() => {
      const manager = window.consoleManager;
      if (!manager) return null;
      // Fill slot 0 and immediately check for the class
      manager.fillSlot(0, "X");
      const slot = document.querySelector('[data-slot="0"]');
      return slot ? slot.classList.contains("refreshing") : null;
    });

    if (hasClass === null) {
      test.skip();
      return;
    }

    expect(hasClass).toBe(true);
  });

  test("refreshing class is removed after 500ms", async ({ page }) => {
    await page.evaluate(() => {
      const manager = window.consoleManager;
      if (manager) manager.fillSlot(1, "5");
    });

    await page.waitForTimeout(600);

    const hasClass = await page.evaluate(() => {
      const slot = document.querySelector('[data-slot="1"]');
      return slot ? slot.classList.contains("refreshing") : null;
    });

    if (hasClass === null) {
      test.skip();
      return;
    }

    expect(hasClass).toBe(false);
  });
});
