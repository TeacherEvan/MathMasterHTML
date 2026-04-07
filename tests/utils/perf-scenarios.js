// @ts-check

import { enablePerfMetrics } from "./perf-metrics.js";

const DEFAULT_LEVEL = "beginner";
const WRONG_SYMBOL = "@";

async function dispatchCorrectSymbolClicks(page, count = 1) {
  return page.evaluate((times) => {
    let dispatches = 0;

    for (let i = 0; i < times; i++) {
      const stepIndex =
        window.GameProblemManager?.currentSolutionStepIndex ?? 0;
      const nextHiddenSymbol = document.querySelector(
        `[data-step-index="${stepIndex}"].hidden-symbol`,
      );

      if (!nextHiddenSymbol?.textContent) {
        break;
      }

      document.dispatchEvent(
        new CustomEvent("symbolClicked", {
          detail: { symbol: nextHiddenSymbol.textContent },
        }),
      );
      dispatches++;
    }

    return dispatches;
  }, count);
}

async function dispatchWrongSymbolClicks(page, count = 1) {
  return page.evaluate(
    ({ times, symbol }) => {
      let dispatches = 0;

      for (let i = 0; i < times; i++) {
        document.dispatchEvent(
          new CustomEvent("symbolClicked", {
            detail: { symbol },
          }),
        );
        dispatches++;
      }

      return dispatches;
    },
    { times: count, symbol: WRONG_SYMBOL },
  );
}

/**
 * Prepare a game run for perf profiling.
 * @param {import('@playwright/test').Page} page
 * @param {{ level?: string, warmupMs?: number }} [opts]
 */
export async function preparePerfGame(page, opts = {}) {
  const level = opts.level ?? DEFAULT_LEVEL;
  const warmupMs = opts.warmupMs ?? 1000;

  await page.goto(`/src/pages/game.html?level=${level}`, {
    waitUntil: "domcontentloaded",
  });

  await enablePerfMetrics(page, { warmupMs });

  const startButton = page.locator("#start-game-btn");
  await startButton.waitFor({ state: "visible", timeout: 10000 });
  await startButton.click({ force: true });

  await page.waitForTimeout(600);
  await page.waitForFunction(
    () => window.wormSystem?.isInitialized === true,
    null,
    { timeout: 10000 },
  );
  await page.waitForFunction(
    () => document.querySelectorAll(".hidden-symbol").length > 0,
    null,
    { timeout: 10000 },
  );
}

/**
 * Idle scenario: let the game run without interaction.
 * @param {import('@playwright/test').Page} page
 * @param {{ durationMs?: number }} [opts]
 */
export async function idleScenario(page, opts = {}) {
  await page.waitForTimeout(opts.durationMs ?? 3000);
}

/**
 * Normal play scenario: reveal a short sequence of correct symbols.
 * @param {import('@playwright/test').Page} page
 * @param {{ reveals?: number }} [opts]
 */
export async function normalPlayScenario(page, opts = {}) {
  const reveals = opts.reveals ?? 5;
  const dispatches = await dispatchCorrectSymbolClicks(page, reveals);
  await page.waitForTimeout(400);
  return dispatches;
}

/**
 * Worm burst scenario: trigger the purple worm threshold with wrong answers.
 * @param {import('@playwright/test').Page} page
 * @param {{ wrongAnswers?: number }} [opts]
 */
export async function wormBurstScenario(page, opts = {}) {
  const wrongAnswers =
    opts.wrongAnswers ??
    (await page.evaluate(
      () => window.GameSymbolHandlerCore?.PURPLE_WORM_THRESHOLD ?? 3,
    ));

  await page.evaluate(() => {
    if (!window.__perfPurpleWormListenerInstalled) {
      window.__perfPurpleWormTriggered = false;
      document.addEventListener("purpleWormTriggered", () => {
        window.__perfPurpleWormTriggered = true;
      });
      window.__perfPurpleWormListenerInstalled = true;
    }

    window.__perfPurpleWormTriggered = false;
  });

  const dispatches = await dispatchWrongSymbolClicks(page, wrongAnswers);

  await page.waitForFunction(
    () => window.__perfPurpleWormTriggered === true,
    null,
    { timeout: 5000 },
  );

  await page.waitForFunction(
    () =>
      window.wormSystem?.worms?.some(
        (worm) => worm.active && Boolean(worm.isPurple),
      ) === true,
    null,
    { timeout: 10000 },
  );
  await page.waitForTimeout(500);

  return dispatches;
}

/**
 * Dense rain scenario: let the master-level symbol rain settle under load.
 * @param {import('@playwright/test').Page} page
 * @param {{ durationMs?: number }} [opts]
 */
export async function denseRainScenario(page, opts = {}) {
  await page.waitForTimeout(opts.durationMs ?? 5000);
}

/**
 * Lock transition scenario: complete the current line and let the lock animate.
 * @param {import('@playwright/test').Page} page
 * @param {{ reveals?: number }} [opts]
 */
export async function lockTransitionScenario(page, opts = {}) {
  const reveals =
    opts.reveals ??
    (await page.evaluate(() => {
      const stepIndex =
        window.GameProblemManager?.currentSolutionStepIndex ?? 0;
      return document.querySelectorAll(
        `[data-step-index="${stepIndex}"].hidden-symbol`,
      ).length;
    }));

  const dispatches = await dispatchCorrectSymbolClicks(page, reveals);

  await page.waitForFunction(
    () => (window.GameProblemManager?.currentSolutionStepIndex ?? 0) > 0,
    null,
    { timeout: 5000 },
  );
  await page.waitForFunction(
    () => {
      const lockManager = window.lockManager;
      return Boolean(
        lockManager &&
          lockManager.lockIsLive === true &&
          lockManager.lockAnimationActive === true &&
          lockManager.isLoadingComponent === false,
      );
    },
    null,
    { timeout: 5000 },
  );
  await page.waitForTimeout(600);

  return dispatches;
}
