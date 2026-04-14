// @ts-check

import { enablePerfMetrics } from "./perf-metrics.js";
import { ensureLandscapeGameplayViewport } from "./onboarding-runtime.js";
import {
  dispatchCorrectSymbolClicks,
  dispatchCorrectSymbolEvents,
  dispatchWrongSymbolEvents,
  getLockState,
  getStepSnapshot,
  HIDDEN_SYMBOL_SELECTOR,
} from "./perf-scenarios.helpers.js";

const DEFAULT_LEVEL = "beginner";
const PURPLE_WORM_TRIGGER_THRESHOLD = 3;

/**
 * Prepare a game run for perf profiling.
 * @param {import('@playwright/test').Page} page
 * @param {{ level?: string, warmupMs?: number }} [opts]
 */
export async function preparePerfGame(page, opts = {}) {
  const level = opts.level ?? DEFAULT_LEVEL;
  const warmupMs = opts.warmupMs ?? 1000;

  await page.addInitScript(() => {
    localStorage.removeItem("mathmaster_onboarding_v1");
  });

  await page.goto(`/src/pages/game.html?level=${level}&evan=off&preload=off`, {
    waitUntil: "domcontentloaded",
  });

  await enablePerfMetrics(page, { warmupMs });
  await ensureLandscapeGameplayViewport(page);

  const startButton = page.locator("#start-game-btn");
  await startButton.waitFor({ state: "visible", timeout: 10000 });
  await startButton.click({ force: true });

  await page.waitForTimeout(600);
  await page.locator("#panel-c .falling-symbol").first().waitFor({
    state: "visible",
    timeout: 10000,
  });
  await page.waitForFunction(
    (hiddenSelector) => document.querySelectorAll(hiddenSelector).length > 0,
    HIDDEN_SYMBOL_SELECTOR,
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
  const result = await dispatchCorrectSymbolClicks(page, reveals);
  if (result.fallbackCount > 0) {
    throw new Error(
      `normalPlayScenario required ${result.fallbackCount} symbolClicked fallback dispatch(es) instead of visible Panel C clicks`,
    );
  }
  await page.waitForTimeout(400);
  return result.clicks;
}

/**
 * Worm burst scenario: trigger the purple worm threshold with wrong answers.
 * @param {import('@playwright/test').Page} page
 * @param {{ wrongAnswers?: number }} [opts]
 */
export async function wormBurstScenario(page, opts = {}) {
  const wrongAnswers = opts.wrongAnswers ?? PURPLE_WORM_TRIGGER_THRESHOLD;

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

  const dispatches = await dispatchWrongSymbolEvents(page, wrongAnswers);

  await page.waitForFunction(
    () => window.__perfPurpleWormTriggered === true,
    null,
    { timeout: 5000 },
  );

  await page.locator(".purple-worm").first().waitFor({
    state: "visible",
    timeout: 10000,
  });
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
  const stepSnapshot = await getStepSnapshot(page);
  const reveals = opts.reveals ?? stepSnapshot.hiddenSymbols.length;
  const lockStateBefore = await getLockState(page);

  const dispatches = await dispatchCorrectSymbolEvents(page, reveals);

  await page.waitForFunction(
    (stepIndex) => {
      if (stepIndex == null) {
        return false;
      }
      return document.querySelectorAll(
        `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`,
      ).length === 0;
    },
    stepSnapshot.stepIndex,
    { timeout: 5000 },
  );
  await page.waitForFunction(
    (previousState) => {
      const lockDisplay = document.getElementById("lock-display");
      if (!lockDisplay) {
        return false;
      }

      const nextLevel = lockDisplay.getAttribute("data-lock-level");
      const nextMoment = lockDisplay.getAttribute("data-lock-moment");
      return (
        nextLevel !== previousState.level || nextMoment !== previousState.moment
      );
    },
    lockStateBefore,
    { timeout: 5000 },
  );
  await page.waitForTimeout(600);

  return dispatches;
}
