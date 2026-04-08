// @ts-check

import { enablePerfMetrics } from "./perf-metrics.js";

const DEFAULT_LEVEL = "beginner";
const WRONG_SYMBOL = "@";
const PURPLE_WORM_TRIGGER_THRESHOLD = 3;
const FALLING_SYMBOL_SELECTOR = "#panel-c .falling-symbol:not(.clicked)";
const HIDDEN_SYMBOL_SELECTOR = "#solution-container .hidden-symbol";

async function getCurrentStepSnapshot(page) {
  return page.evaluate((hiddenSelector) => {
    const firstHiddenSymbol = document.querySelector(hiddenSelector);
    if (!firstHiddenSymbol) {
      return { stepIndex: null, hiddenSymbols: [] };
    }

    const stepIndex = firstHiddenSymbol.getAttribute("data-step-index");
    const hiddenSymbols = Array.from(
      document.querySelectorAll(
        `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`,
      ),
    )
      .map((element) => element.textContent?.trim())
      .filter(Boolean);

    return { stepIndex, hiddenSymbols };
  }, HIDDEN_SYMBOL_SELECTOR);
}

async function waitForFallingSymbolText(page, matcher, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const match = await page.evaluate(
      ({ selector, predicate }) => {
        const symbols = Array.from(document.querySelectorAll(selector));
        for (const symbolElement of symbols) {
          const text = symbolElement.textContent?.trim();
          if (!text) {
            continue;
          }

          if (predicate.type === "exact" && text === predicate.value) {
            return text;
          }

          if (
            predicate.type === "exclude" &&
            !predicate.values.includes(text)
          ) {
            return text;
          }
        }

        return null;
      },
      { selector: FALLING_SYMBOL_SELECTOR, predicate: matcher },
    );

    if (match) {
      return match;
    }

    await page.waitForTimeout(100);
  }

  return null;
}

async function clickFallingSymbolByText(page, symbolText, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const symbolIndex = await page.evaluate(
      ({ selector, symbol }) => {
        return Array.from(document.querySelectorAll(selector)).findIndex(
          (element) => element.textContent?.trim() === symbol,
        );
      },
      { selector: FALLING_SYMBOL_SELECTOR, symbol: symbolText },
    );

    if (symbolIndex >= 0) {
      const symbolLocator = page.locator(FALLING_SYMBOL_SELECTOR).nth(symbolIndex);
      try {
        await symbolLocator.click({ force: true, timeout: 1000 });
        return true;
      } catch {
        // Falling symbols move quickly; retry until timeout if this instance moved away.
      }
    }

    await page.waitForTimeout(100);
  }

  return false;
}

async function dispatchSymbolClickedEvent(page, symbolText) {
  return page.evaluate((symbol) => {
    document.dispatchEvent(
      new CustomEvent("symbolClicked", {
        detail: { symbol },
      }),
    );
    return true;
  }, symbolText);
}

async function dispatchCorrectSymbolEvents(page, count = 1) {
  let dispatches = 0;

  for (let index = 0; index < count; index += 1) {
    const { hiddenSymbols } = await getCurrentStepSnapshot(page);
    const nextHiddenSymbol = hiddenSymbols[0];
    if (!nextHiddenSymbol) {
      break;
    }

    await dispatchSymbolClickedEvent(page, nextHiddenSymbol);
    dispatches += 1;
    await page.waitForTimeout(50);
  }

  return dispatches;
}

async function dispatchWrongSymbolEvents(page, count = 1) {
  let dispatches = 0;

  for (let index = 0; index < count; index += 1) {
    await dispatchSymbolClickedEvent(page, WRONG_SYMBOL);
    dispatches += 1;
    await page.waitForTimeout(50);
  }

  return dispatches;
}

async function dispatchCorrectSymbolClicks(page, count = 1) {
  let clicks = 0;
  let fallbackCount = 0;

  for (let index = 0; index < count; index += 1) {
    const { hiddenSymbols } = await getCurrentStepSnapshot(page);
    const nextHiddenSymbol = hiddenSymbols[0];
    if (!nextHiddenSymbol) {
      break;
    }

    const matchingSymbol = await waitForFallingSymbolText(page, {
      type: "exact",
      value: nextHiddenSymbol,
    });
    const usedFallback = !matchingSymbol;
    const clicked = usedFallback
      ? await dispatchSymbolClickedEvent(page, nextHiddenSymbol)
      : await clickFallingSymbolByText(page, matchingSymbol);
    if (!clicked) {
      break;
    }

    clicks += 1;
    if (usedFallback) {
      fallbackCount += 1;
    }
    await page.waitForTimeout(150);
  }

  return { clicks, fallbackCount };
}

async function dispatchWrongSymbolClicks(page, count = 1) {
  let clicks = 0;

  for (let index = 0; index < count; index += 1) {
    const { hiddenSymbols } = await getCurrentStepSnapshot(page);
    const wrongSymbol = await waitForFallingSymbolText(page, {
      type: "exclude",
      values: [...new Set([...hiddenSymbols, WRONG_SYMBOL])],
    });
    const clicked = wrongSymbol
      ? await clickFallingSymbolByText(page, wrongSymbol)
      : await dispatchSymbolClickedEvent(page, WRONG_SYMBOL);
    if (!clicked) {
      break;
    }

    clicks += 1;
    await page.waitForTimeout(150);
  }

  return clicks;
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
  const stepSnapshot = await getCurrentStepSnapshot(page);
  const reveals = opts.reveals ?? stepSnapshot.hiddenSymbols.length;
  const lockStateBefore = await page.evaluate(() => {
    const lockDisplay = document.getElementById("lock-display");
    return {
      level: lockDisplay?.getAttribute("data-lock-level") ?? null,
      moment: lockDisplay?.getAttribute("data-lock-moment") ?? null,
    };
  });

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
