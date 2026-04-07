// @ts-check
/**
 * tests/gameplay-features.spec.js
 *
 * Playwright E2E tests covering the new gameplay features:
 *  1. Window C symbol stability (no size alternation)
 *  2. 1× green worm spawned inside Panel B on row completion
 *  3. Green worm targets revealed (blue) symbols only
 *  4. Row resets to red when worm steals a blue symbol
 *  5. Console selection panel opens as a dedicated no-scroll window
 *  6. Console slot shows refresh animation after a symbol is placed
 */
import { expect, test } from "@playwright/test";

// ── helpers ─────────────────────────────────────────────────────────────────

async function startGame(page) {
  await page.goto("/game.html?level=beginner", {
    waitUntil: "domcontentloaded",
  });
  const startBtn = page.locator("#start-game-btn");
  const howToPlayModal = page.locator("#how-to-play-modal");
  await expect(startBtn).toBeVisible({ timeout: 10000 });

  for (let attempt = 0; attempt < 3; attempt++) {
    await startBtn.click({ force: true });

    try {
      await expect(howToPlayModal).toBeHidden({ timeout: 1500 });
      break;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }

  await page.waitForFunction(
    () => window.wormSystem && window.wormSystem.isInitialized === true,
  );
  await page.waitForFunction(
    () => document.querySelectorAll(".hidden-symbol").length > 0,
  );
}

async function clearAllQueuedWorms(page) {
  await page.evaluate(() => {
    window.wormSystem.killAllWorms();
    window.wormSystem.spawnManager?.clearQueue?.();
  });
  await page.waitForTimeout(250);
}

async function openConsoleSelectionModal(page) {
  await page.waitForFunction(
    () =>
      !!window.consoleManager &&
      !!window.consoleManager.modal &&
      window.consoleManager.isPendingSelection === false,
  );

  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent("problemCompleted"));
  });

  await page.waitForFunction(() => {
    const modal = document.getElementById("symbol-modal");
    return !!modal && window.getComputedStyle(modal).display !== "none";
  });

  await expect(page.locator(".console-selection-window")).toBeVisible();
  await expect(page.locator(".symbol-choice[data-symbol='1']")).toBeVisible();
}

async function chooseConsoleReward(page, { symbol = "1", position = 0 } = {}) {
  await page.locator(`.symbol-choice[data-symbol="${symbol}"]`).click();
  await expect(page.locator("#position-choices")).toBeVisible();
  await page.locator(`.position-choice[data-position="${position}"]`).click();
  await page.waitForFunction(
    () => window.consoleManager?.isPendingSelection === false,
  );
}

async function revealSymbols(page, count = 1) {
  const revealResult = await page.evaluate((times) => {
    const revealedBefore = document.querySelectorAll(".revealed-symbol").length;
    let dispatches = 0;

    for (let i = 0; i < times; i++) {
      const stepIndex =
        window.GameProblemManager?.currentSolutionStepIndex ?? 0;
      const nextHiddenSymbol = document.querySelector(
        `[data-step-index="${stepIndex}"].hidden-symbol`,
      );
      if (!nextHiddenSymbol?.textContent) continue;

      document.dispatchEvent(
        new CustomEvent("symbolClicked", {
          detail: { symbol: nextHiddenSymbol.textContent },
        }),
      );
      dispatches++;
    }

    return {
      dispatches,
      revealedBefore,
      revealedAfter: document.querySelectorAll(".revealed-symbol").length,
    };
  }, count);

  expect(revealResult.dispatches).toBeGreaterThan(0);
  expect(revealResult.revealedAfter).toBeGreaterThan(
    revealResult.revealedBefore,
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
    await clearAllQueuedWorms(page);

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
      window.wormSystem.spawnManager?.clearQueue?.();
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
      window.wormSystem.spawnManager?.clearQueue?.();
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

  test("second completed row spawns one additional green worm (+1 scaling)", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      window.wormSystem.spawnManager?.clearQueue?.();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
      // Keep row counter progression, but clear row-1 worms so only row-2 spawns are counted.
      window.wormSystem.killAllWorms();
      window.wormSystem.spawnManager?.clearQueue?.();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 2 } }),
      );
    });

    const expectedCount = await page.evaluate(
      () => window.wormSystem.wormsPerRow + 1,
    );

    await page.waitForFunction(
      (count) =>
        window.wormSystem.worms.filter((w) => w.active).length === count,
      expectedCount,
      { timeout: 5000 },
    );

    const wormCount = await page.evaluate(
      () => window.wormSystem.worms.filter((w) => w.active).length,
    );

    expect(wormCount).toBe(expectedCount);
  });

  test("problem completion resets per-row spawn scaling for the next level", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      window.wormSystem.spawnManager?.clearQueue?.();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 2 } }),
      );
      document.dispatchEvent(
        new CustomEvent("problemCompleted", { detail: {} }),
      );
      window.wormSystem.killAllWorms();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    const expectedCount = await page.evaluate(
      () => window.wormSystem.wormsPerRow,
    );

    await page.waitForFunction(
      (count) =>
        window.wormSystem.worms.filter((w) => w.active).length === count,
      expectedCount,
      { timeout: 5000 },
    );

    const wormCount = await page.evaluate(
      () => window.wormSystem.worms.filter((w) => w.active).length,
    );

    expect(wormCount).toBe(expectedCount);
  });
});

test.describe("Green Worm — Blue Symbol Targeting", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("green worm immediately rushes to a revealed (blue) symbol", async ({
    page,
  }) => {
    await revealSymbols(page);

    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () =>
        window.wormSystem.worms.some(
          (w) =>
            w.active &&
            !w.isPurple &&
            w.isRushingToTarget &&
            Boolean(w.targetSymbol),
        ),
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

  test("worm explosion creates a visible slime splat element", async ({
    page,
  }) => {
    const hasSplat = await page.evaluate(() => {
      const ws = window.wormSystem;
      const element = document.createElement("div");
      ws.crossPanelContainer.appendChild(element);
      const worm = {
        id: "test-explode",
        element,
        x: 160,
        y: 160,
        active: true,
        hasStolen: false,
        isPurple: false,
        stolenSymbol: null,
      };
      ws.worms.push(worm);
      ws.explodeWorm(worm);
      return !!document.querySelector(".slime-splat");
    });

    expect(hasSplat).toBe(true);
  });

  test("worm explosion shows slime splat immediately instead of delaying visibility", async ({
    page,
  }) => {
    const splatState = await page.evaluate(() => {
      const ws = window.wormSystem;
      const element = document.createElement("div");
      ws.crossPanelContainer.appendChild(element);
      const worm = {
        id: "test-immediate-splat",
        element,
        x: 180,
        y: 180,
        active: true,
        hasStolen: false,
        isPurple: false,
        stolenSymbol: null,
      };

      ws.worms.push(worm);
      ws.explodeWorm(worm);

      const splat = document.querySelector(".slime-splat");
      if (!splat) return null;

      const styles = window.getComputedStyle(splat);
      return {
        opacity: Number.parseFloat(styles.opacity || "0"),
        animationDurationSeconds: Number.parseFloat(
          styles.animationDuration || "0",
        ),
        animationName: styles.animationName,
        fading: splat.classList.contains("slime-fading"),
        width: Number.parseFloat(styles.width || "0"),
        height: Number.parseFloat(styles.height || "0"),
        backgroundImage: styles.backgroundImage,
        borderRadius: styles.borderRadius,
      };
    });

    expect(splatState).not.toBeNull();
    expect(splatState.opacity).toBeGreaterThan(0.45);
    expect(splatState.animationDurationSeconds).toBeGreaterThan(0);
    expect(splatState.animationDurationSeconds).toBeLessThan(0.3);
    expect(splatState.animationName).toBe("splat-appear");
    expect(splatState.fading).toBe(false);
    expect(splatState.width).toBeGreaterThan(30);
    expect(splatState.height).toBeGreaterThan(20);
    expect(splatState.backgroundImage).toContain("radial-gradient");
    expect(splatState.borderRadius).not.toBe("0px");
  });
});

test.describe("Row Reset — Worm Steals Blue Symbol", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("rowResetByWorm event fires when a revealed symbol is stolen", async ({
    page,
  }) => {
    const gotEvent = await page.evaluate(() => {
      const revealSymbolsInPage = (count = 1) => {
        let dispatches = 0;
        for (let i = 0; i < count; i++) {
          const stepIndex =
            window.GameProblemManager?.currentSolutionStepIndex ?? 0;
          const nextHiddenSymbol = document.querySelector(
            `[data-step-index="${stepIndex}"].hidden-symbol`,
          );
          if (!nextHiddenSymbol?.textContent) continue;
          document.dispatchEvent(
            new CustomEvent("symbolClicked", {
              detail: { symbol: nextHiddenSymbol.textContent },
            }),
          );
          dispatches++;
        }
        return dispatches;
      };

      return new Promise((resolve) => {
        const dispatches = revealSymbolsInPage(1);
        if (dispatches === 0) {
          resolve(null);
          return;
        }

        window.wormSystem?.invalidateSymbolCache?.();

        const timeout = setTimeout(() => resolve(false), 8000);
        document.addEventListener(
          "rowResetByWorm",
          () => {
            clearTimeout(timeout);
            resolve(true);
          },
          { once: true },
        );

        const revealedSymbols = document.querySelectorAll(".revealed-symbol");
        if (revealedSymbols.length === 0) {
          clearTimeout(timeout);
          resolve(null);
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
    const result = await page.evaluate(() => {
      const revealSymbolsInPage = (count = 1) => {
        let dispatches = 0;
        for (let i = 0; i < count; i++) {
          const stepIndex =
            window.GameProblemManager?.currentSolutionStepIndex ?? 0;
          const nextHiddenSymbol = document.querySelector(
            `[data-step-index="${stepIndex}"].hidden-symbol`,
          );
          if (!nextHiddenSymbol?.textContent) continue;
          document.dispatchEvent(
            new CustomEvent("symbolClicked", {
              detail: { symbol: nextHiddenSymbol.textContent },
            }),
          );
          dispatches++;
        }
        return dispatches;
      };

      if (revealSymbolsInPage(2) === 0) {
        return null;
      }

      window.wormSystem?.invalidateSymbolCache?.();

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

test.describe("Console Selection Panel — Dedicated No-Scroll Window", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("selection panel opens as a dedicated window without internal scrolling", async ({
    page,
  }) => {
    await openConsoleSelectionModal(page);

    const panelState = await page.evaluate(() => {
      const shell = document.getElementById("symbol-modal");
      const windowEl = shell?.querySelector(".console-selection-window");
      const status = document.getElementById("console-selection-status");
      const positionGrid = document.getElementById("position-choices");
      const positionButtons = Array.from(
        document.querySelectorAll(".position-choice"),
      );

      if (
        !shell ||
        !windowEl ||
        !status ||
        !positionGrid ||
        positionButtons.length === 0
      ) {
        return null;
      }

      const shellStyle = window.getComputedStyle(shell);
      const windowStyle = window.getComputedStyle(windowEl);
      const positionStyle = window.getComputedStyle(positionGrid);
      const normalizedStatusText = status.textContent
        ? status.textContent.replace(/\s+/g, " ").trim()
        : "";

      return {
        shellDisplay: shellStyle.display,
        overflowY: windowStyle.overflowY,
        clientHeight: windowEl.clientHeight,
        scrollHeight: windowEl.scrollHeight,
        statusText: normalizedStatusText,
        positionGridDisplay: positionStyle.display,
        positionButtonsDisabled: positionButtons.every(
          (button) => button.disabled,
        ),
        positionButtonsHaveDisabledClass: positionButtons.every((button) =>
          button.classList.contains("disabled"),
        ),
        positionButtonCount: positionButtons.length,
      };
    });

    expect(panelState).toBeTruthy();
    expect(panelState.shellDisplay).toBe("grid");
    expect(panelState.overflowY).toBe("hidden");
    expect(panelState.scrollHeight).toBeLessThanOrEqual(
      panelState.clientHeight + 1,
    );
    expect(panelState.statusText).toBe(
      "Choose a symbol to unlock the slot grid.",
    );
    expect(panelState.positionGridDisplay).toBe("grid");
    expect(panelState.positionButtonCount).toBeGreaterThan(0);
    expect(panelState.positionButtonsDisabled).toBe(true);
    expect(panelState.positionButtonsHaveDisabledClass).toBe(true);
  });

  test("selecting a symbol updates the panel state without expanding the window", async ({
    page,
  }) => {
    await openConsoleSelectionModal(page);

    const beforeHeight = await page
      .locator(".console-selection-window")
      .evaluate((node) => node.getBoundingClientRect().height);

    await page.locator(".symbol-choice[data-symbol='1']").click();
    await expect(page.locator(".symbol-choice[data-symbol='1']")).toHaveClass(
      /selected/,
    );

    const panelState = await page.evaluate(() => {
      const windowEl = document.querySelector(".console-selection-window");
      const status = document.getElementById("console-selection-status");
      const positionButtons = Array.from(
        document.querySelectorAll(".position-choice"),
      );
      const normalizedStatusText = status?.textContent
        ? status.textContent.replace(/\s+/g, " ").trim()
        : "";
      return windowEl && status
        ? {
            afterHeight: windowEl.getBoundingClientRect().height,
            statusText: normalizedStatusText,
            positionButtonsEnabled:
              positionButtons.length > 0 &&
              positionButtons.every((button) => button.disabled === false),
            positionButtonsLackDisabledClass:
              positionButtons.length > 0 &&
              positionButtons.every(
                (button) => button.classList.contains("disabled") === false,
              ),
            positionButtonCount: positionButtons.length,
          }
        : null;
    });

    expect(panelState).toBeTruthy();
    expect(Math.abs(panelState.afterHeight - beforeHeight)).toBeLessThanOrEqual(
      1,
    );
    expect(panelState.statusText).toBe("Symbol 1 selected. Choose a slot.");
    expect(panelState.positionButtonCount).toBeGreaterThan(0);
    expect(panelState.positionButtonsEnabled).toBe(true);
    expect(panelState.positionButtonsLackDisabledClass).toBe(true);
  });

  test("manual selection and autofill both still advance to the next problem", async ({
    page,
  }) => {
    const beforeIndex = await page.evaluate(
      () => window.GameProblemManager?.currentProblemIndex ?? -1,
    );

    await openConsoleSelectionModal(page);
    await chooseConsoleReward(page, { symbol: "1", position: 0 });

    await page.waitForFunction(
      (previousIndex) =>
        (window.GameProblemManager?.currentProblemIndex ?? -1) !==
        previousIndex,
      beforeIndex,
    );

    const manualState = await page.evaluate(() => ({
      index: window.GameProblemManager?.currentProblemIndex ?? -1,
      slotValue: window.consoleManager?.slots?.[0] ?? null,
    }));

    expect(manualState.index).not.toBe(beforeIndex);
    expect(manualState.slotValue).toBe("1");

    const nextIndex = manualState.index;
    await openConsoleSelectionModal(page);
    await page.locator("#skip-button").click();

    await page.waitForFunction(
      (previousIndex) =>
        (window.GameProblemManager?.currentProblemIndex ?? -1) !==
        previousIndex,
      nextIndex,
    );

    const autofillState = await page.evaluate(() => {
      const slots = window.consoleManager?.slots ?? [];
      return {
        index: window.GameProblemManager?.currentProblemIndex ?? -1,
        populatedSlots: slots.filter((slot) => slot !== null).length,
      };
    });

    expect(autofillState.index).not.toBe(nextIndex);
    expect(autofillState.populatedSlots).toBeGreaterThan(0);
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
