// @ts-check
import { expect, test } from "@playwright/test";

async function revealCurrentStepSymbol(page) {
  const result = await page.evaluate(() => {
    const stepIndex = window.GameProblemManager?.currentSolutionStepIndex ?? 0;
    const nextHiddenSymbol = document.querySelector(
      `[data-step-index="${stepIndex}"].hidden-symbol`,
    );
    if (!nextHiddenSymbol?.textContent) {
      return { symbol: null, revealedCount: 0 };
    }

    document.dispatchEvent(
      new CustomEvent("symbolClicked", {
        detail: { symbol: nextHiddenSymbol.textContent },
      }),
    );

    return {
      symbol: nextHiddenSymbol.textContent,
      revealedCount: document.querySelectorAll(".revealed-symbol").length,
    };
  });

  expect(result.symbol).toBeTruthy();
  expect(result.revealedCount).toBeGreaterThan(0);
}

async function dispatchPointerDownOnActiveWorm(page, predicateSource) {
  const dispatched = await page.evaluate((predicateBody) => {
    const predicate = new Function("worm", `return (${predicateBody})(worm);`);
    const worm = window.wormSystem?.worms.find(
      (candidate) => candidate.active && predicate(candidate),
    );
    if (!worm?.element) {
      return null;
    }

    const eventInit = { bubbles: true, cancelable: true };
    const event =
      typeof PointerEvent === "function"
        ? new PointerEvent("pointerdown", eventInit)
        : new Event("pointerdown", eventInit);
    worm.element.dispatchEvent(event);

    return {
      id: worm.id,
      active: worm.active,
      escapeUntil: worm.escapeUntil ?? 0,
    };
  }, predicateSource);

  expect(dispatched).toBeTruthy();
  return dispatched;
}

test.describe("Worm behavior: aggression, targeting, and click rules", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });
    await page.waitForTimeout(600);

    await page.waitForFunction(
      () => window.wormSystem && window.wormSystem.isInitialized === true,
    );
    await page.waitForFunction(
      () => document.querySelectorAll(".hidden-symbol").length > 0,
    );
  });

  test("worms immediately target revealed symbols", async ({ page }) => {
    await revealCurrentStepSymbol(page);

    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(() =>
      window.wormSystem?.worms.some(
        (w) =>
          w.active &&
          !w.isPurple &&
          w.isRushingToTarget &&
          Boolean(w.targetSymbol),
      ),
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
    expect(wormState?.isRushingToTarget).toBeTruthy();
    expect(wormState?.targetSymbol).toBeTruthy();
  });

  test("green worms die on single tap", async ({ page }) => {
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () => document.querySelectorAll(".worm-container").length > 0,
    );

    const afterFirstTap = await dispatchPointerDownOnActiveWorm(
      page,
      "(worm) => !worm.isPurple",
    );

    expect(afterFirstTap).toBeTruthy();
    await page.waitForFunction(
      (wormId) => {
        const worm = window.wormSystem?.worms.find(
          (candidate) => candidate.id === wormId,
        );
        return !worm || worm.active === false;
      },
      afterFirstTap.id,
      { timeout: 5000 },
    );
  });

  test("purple worm click clones instead of dying", async ({ page }) => {
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent("purpleWormTriggered"));
    });

    await page.waitForFunction(() =>
      window.wormSystem?.worms.some((w) => w.active && w.isPurple),
    );

    const beforeClickCount = await page.evaluate(
      () =>
        window.wormSystem.worms.filter((w) => w.active && w.isPurple).length,
    );

    await dispatchPointerDownOnActiveWorm(page, "(worm) => worm.isPurple");
    await page.waitForFunction(
      (countBefore) =>
        window.wormSystem.worms.filter((w) => w.active && w.isPurple).length >
        countBefore,
      beforeClickCount,
      { timeout: 5000 },
    );

    const afterClickState = await page.evaluate(() => ({
      purpleCount: window.wormSystem.worms.filter((w) => w.active && w.isPurple)
        .length,
      totalActive: window.wormSystem.worms.filter((w) => w.active).length,
    }));

    expect(afterClickState.purpleCount).toBeGreaterThan(beforeClickCount);
    expect(afterClickState.totalActive).toBeGreaterThanOrEqual(2);
  });
});
