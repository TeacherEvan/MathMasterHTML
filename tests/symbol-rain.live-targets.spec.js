import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

function normalizeSymbolText(value) {
  const normalized = String(value || "").trim();
  return normalized === "x" ? "X" : normalized;
}

const SOAK_SAMPLE_INTERVAL_MS = 250;
const SOAK_WINDOW_MS = 5000;
const SOAK_REQUIRED_CONSECUTIVE_VISIBLE_SAMPLES = 4;
const SOAK_MIN_VISIBLE_TRACKED_SYMBOLS = 1;
const SOAK_MIN_VISIBLE_PANEL_C_SYMBOLS = 1;

async function getCurrentStepSnapshot(page) {
  return page.evaluate(() => {
    const firstHidden = document.querySelector(
      "#solution-container .hidden-symbol",
    );
    if (!firstHidden) {
      return { stepIndex: null, hiddenSymbols: [] };
    }

    const stepIndex = firstHidden.getAttribute("data-step-index");
    const hiddenSymbols = Array.from(
      document.querySelectorAll(
        `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`,
      ),
    )
      .map((element) => element.dataset.expected || element.textContent || "")
      .map((value) => String(value).trim())
      .filter(Boolean);

    return { stepIndex, hiddenSymbols };
  });
}

async function getCurrentNeededSymbols(page) {
  return page.evaluate(() => {
    const stepIndex = window.GameSymbolHandlerCore?.getCurrentStepIndex?.();
    const selector =
      Number.isInteger(stepIndex) && stepIndex >= 0
        ? `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`
        : "#solution-container .hidden-symbol";

    return Array.from(document.querySelectorAll(selector))
      .map((element) => element.dataset.expected || element.textContent || "")
      .map((value) => String(value).trim())
      .filter(Boolean);
  });
}

async function findVisibleMatchingSymbol(page, symbols, timeoutMs = 5000) {
  const candidates = (Array.isArray(symbols) ? symbols : [symbols])
    .filter(Boolean)
    .map((symbol) => normalizeSymbolText(symbol));
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const visibleSymbols = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"),
      )
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const panel = element.closest("#panel-c");
          const panelRect = panel?.getBoundingClientRect();
          if (!panelRect) {
            return false;
          }

          return (
            rect.bottom > panelRect.top &&
            rect.top < panelRect.bottom &&
            rect.right > panelRect.left &&
            rect.left < panelRect.right
          );
        })
        .map((element) => element.textContent?.trim())
        .filter(Boolean),
    );

    const normalizedVisibleSymbols = visibleSymbols.map((symbol) =>
      normalizeSymbolText(symbol),
    );

    const match = candidates.find((symbol) =>
      normalizedVisibleSymbols.includes(symbol),
    );
    if (match) {
      return match;
    }

    await page.waitForTimeout(100);
  }

  return null;
}

async function clickLiveMatchingSymbol(page, symbolText, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  const normalizedTarget = normalizeSymbolText(symbolText);

  while (Date.now() < deadline) {
    const clicked = await page.evaluate((targetSymbol) => {
      const normalize = (value) => {
        const normalized = String(value || "").trim();
        return normalized === "x" ? "X" : normalized;
      };
      const candidates = Array.from(
        document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"),
      );
      const matching = candidates.filter((element) => {
        if (normalize(element.textContent) !== targetSymbol) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        const panel = element.closest("#panel-c");
        const panelRect = panel?.getBoundingClientRect();
        if (!panelRect) {
          return false;
        }

        return (
          rect.bottom > panelRect.top &&
          rect.top < panelRect.bottom &&
          rect.right > panelRect.left &&
          rect.left < panelRect.right
        );
      });
      const target = matching.at(-1);

      if (!target) {
        return false;
      }

      target.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 1,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 0,
        }),
      );
      return true;
    }, normalizedTarget);

    if (clicked) {
      return true;
    }

    await page.waitForTimeout(100);
  }

  return false;
}

async function hasVisibleMatchingSymbol(page, symbolText) {
  const normalizedTarget = normalizeSymbolText(symbolText);

  return page.evaluate((targetSymbol) => {
    const normalize = (value) => {
      const normalized = String(value || "").trim();
      return normalized === "x" ? "X" : normalized;
    };

    return Array.from(
      document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"),
    ).some((element) => {
      if (normalize(element.textContent) !== targetSymbol) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      const panel = element.closest("#panel-c");
      const panelRect = panel?.getBoundingClientRect();
      if (!panelRect) {
        return false;
      }

      return (
        rect.bottom > panelRect.top &&
        rect.top < panelRect.bottom &&
        rect.right > panelRect.left &&
        rect.left < panelRect.right
      );
    });
  }, normalizedTarget);
}

async function getVisibleMatchingSymbols(page, symbolTexts) {
  const normalizedTargets = [...new Set((Array.isArray(symbolTexts) ? symbolTexts : [symbolTexts])
    .filter(Boolean)
    .map((symbol) => normalizeSymbolText(symbol)))];

  return page.evaluate((targetSymbols) => {
    const normalize = (value) => {
      const normalized = String(value || "").trim();
      return normalized === "x" ? "X" : normalized;
    };

    const visibleSymbols = new Set();

    Array.from(document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"))
      .forEach((element) => {
        const symbolText = normalize(element.textContent);
        if (!targetSymbols.includes(symbolText)) {
          return;
        }

        const rect = element.getBoundingClientRect();
        const panel = element.closest("#panel-c");
        const panelRect = panel?.getBoundingClientRect();
        if (!panelRect) {
          return;
        }

        const intersectsPanel =
          rect.bottom > panelRect.top &&
          rect.top < panelRect.bottom &&
          rect.right > panelRect.left &&
          rect.left < panelRect.right;

        if (intersectsPanel) {
          visibleSymbols.add(symbolText);
        }
      });

    return Array.from(visibleSymbols);
  }, normalizedTargets);
}

async function getVisiblePanelCSymbols(page) {
  return page.evaluate(() => {
    const symbols = new Set();

    Array.from(document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"))
      .forEach((element) => {
        const rect = element.getBoundingClientRect();
        const panel = element.closest("#panel-c");
        const panelRect = panel?.getBoundingClientRect();
        if (!panelRect) {
          return;
        }

        const intersectsPanel =
          rect.bottom > panelRect.top &&
          rect.top < panelRect.bottom &&
          rect.right > panelRect.left &&
          rect.left < panelRect.right;

        if (intersectsPanel) {
          symbols.add(String(element.textContent || "").trim());
        }
      });

    return Array.from(symbols).filter(Boolean);
  });
}

async function sampleVisiblePanelCState(page, trackedSymbols = []) {
  const normalizedTrackedSymbols = [
    ...new Set(
      trackedSymbols
        .filter(Boolean)
        .map((symbol) => normalizeSymbolText(symbol)),
    ),
  ];

  return page.evaluate((targetSymbols) => {
    const normalize = (value) => {
      const normalized = String(value || "").trim();
      return normalized === "x" ? "X" : normalized;
    };

    const visiblePanelCSymbols = new Set();
    const visibleTrackedSymbols = new Set();

    Array.from(
      document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"),
    ).forEach((element) => {
      const rect = element.getBoundingClientRect();
      const panel = element.closest("#panel-c");
      const panelRect = panel?.getBoundingClientRect();
      if (!panelRect) {
        return;
      }

      const intersectsPanel =
        rect.bottom > panelRect.top &&
        rect.top < panelRect.bottom &&
        rect.right > panelRect.left &&
        rect.left < panelRect.right;

      if (!intersectsPanel) {
        return;
      }

      const symbolText = normalize(element.textContent);
      if (!symbolText) {
        return;
      }

      visiblePanelCSymbols.add(symbolText);

      if (targetSymbols.includes(symbolText)) {
        visibleTrackedSymbols.add(symbolText);
      }
    });

    return {
      visiblePanelCSymbolCount: visiblePanelCSymbols.size,
      visiblePanelCSymbols: Array.from(visiblePanelCSymbols),
      visibleTrackedCount: visibleTrackedSymbols.size,
      visibleTrackedSymbols: Array.from(visibleTrackedSymbols),
    };
  }, normalizedTrackedSymbols);
}

test.describe("Symbol rain live targets", () => {
  const chromiumProjects = new Set(["chromium", "qa-matrix-chromium"]);
  const soakProjects = new Set(["qa-matrix-chromium", "qa-soak-webkit", "qa-soak-firefox"]);

  test("keeps the active hidden symbol raining as a live Panel C target on desktop gameplay", async ({
    page,
  }, testInfo) => {
    test.skip(
      !chromiumProjects.has(testInfo.project.name),
      "This desktop contract only runs on the Chromium gameplay project.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    for (let revealIndex = 0; revealIndex < 3; revealIndex += 1) {
      const before = await getCurrentStepSnapshot(page);
      const targetSymbol = await findVisibleMatchingSymbol(
        page,
        before.hiddenSymbols,
      );

      expect(targetSymbol).toBeTruthy();

      const screenshotPath = testInfo.outputPath(
        `live-target-visible-${normalizeSymbolText(targetSymbol)}.png`,
      );

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      await testInfo.attach("live-target-visible", {
        path: screenshotPath,
        contentType: "image/png",
      });

      const clicked = await clickLiveMatchingSymbol(page, targetSymbol);
      expect(clicked).toBe(true);

      await page.waitForFunction(
        ({ stepIndex, previousHiddenCount, symbol }) => {
          if (stepIndex == null) {
            return false;
          }

          const remaining = Array.from(
            document.querySelectorAll(
              `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`,
            ),
          )
            .map((element) => element.dataset.expected || element.textContent || "")
            .map((value) => String(value).trim())
            .filter(Boolean);

          return (
            remaining.length < previousHiddenCount || !remaining.includes(symbol)
          );
        },
        {
          stepIndex: before.stepIndex,
          previousHiddenCount: before.hiddenSymbols.length,
          symbol: targetSymbol,
        },
        { timeout: 5000 },
      );
    }
  });

  test("re-spawns a missing Panel C target on the 5 second guarantee interval", async ({
    page,
  }, testInfo) => {
    test.skip(
      !chromiumProjects.has(testInfo.project.name),
      "This desktop contract only runs on the Chromium gameplay project.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const before = await getCurrentStepSnapshot(page);
    const targetSymbol = before.hiddenSymbols[0];

    expect(targetSymbol).toBeTruthy();

    await page.evaluate((symbolText) => {
      const normalize = (value) => {
        const normalized = String(value || "").trim();
        return normalized === "x" ? "X" : normalized;
      };

      const state = window.__symbolRainState;
      const helpers = window.SymbolRainHelpers;

      if (!state || !helpers?.cleanupSymbolObject) {
        return;
      }

      const normalizedTarget = normalize(symbolText);

      for (
        let index = state.activeFallingSymbols.length - 1;
        index >= 0;
        index -= 1
      ) {
        const symbolObj = state.activeFallingSymbols[index];
        if (normalize(symbolObj?.symbol) !== normalizedTarget) {
          continue;
        }

        state.activeFallingSymbols.splice(index, 1);
        helpers.cleanupSymbolObject({
          symbolObj,
          activeFaceReveals: state.activeFaceReveals,
          symbolPool: state.symbolPool,
          spatialGrid: state.spatialGrid,
        });
      }

      state.config.spawnRate = 0;
      state.config.burstSpawnRate = 0;

      const currentTime = Date.now();
      state.lastSymbolSpawnTimestamp[symbolText] = currentTime;
      state.lastSymbolSpawnTimestamp.X = currentTime;
      state.lastSymbolSpawnTimestamp.x = currentTime;
    }, targetSymbol);

    await page.waitForTimeout(1000);

    await expect
      .poll(async () => hasVisibleMatchingSymbol(page, targetSymbol), {
        timeout: 10000,
      })
      .toBe(true);
  });

  test("keeps Panel C targets flowing for 60 seconds @soak", async ({
    page,
  }, testInfo) => {
    test.skip(
      !soakProjects.has(testInfo.project.name),
      "This soak contract only runs on the Chromium, WebKit, and Firefox gameplay projects.",
    );

    test.setTimeout(90000);

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const expectedTrackedSymbols = [
      ...new Set(
        (await getCurrentNeededSymbols(page)).map((symbol) =>
          normalizeSymbolText(symbol),
        ),
      ),
    ].filter(Boolean);

    expect(expectedTrackedSymbols.length).toBeGreaterThan(0);

    const soakDeadline = Date.now() + 60000;
    const soakStart = Date.now();
    let iterationCount = 0;
    const observedVisibleSymbols = new Set();
    const proofTimeline = [];

    while (Date.now() < soakDeadline) {
      const windowDeadline = Math.min(Date.now() + SOAK_WINDOW_MS, soakDeadline);
      const visibleThisWindow = new Set();
      let capturedWindowScreenshot = false;
      let consecutiveVisibleSamples = 0;
      let maxConsecutiveVisibleSamples = 0;

      while (Date.now() < windowDeadline) {
        const visibilitySnapshot = await sampleVisiblePanelCState(
          page,
          expectedTrackedSymbols,
        );
        const trackedVisibleSymbols = visibilitySnapshot.visibleTrackedSymbols
          .map((symbol) => normalizeSymbolText(symbol))
          .filter((symbol) => expectedTrackedSymbols.includes(symbol));

        trackedVisibleSymbols.forEach((symbol) => {
          visibleThisWindow.add(symbol);
          observedVisibleSymbols.add(symbol);
        });

        const meetsVisibilityThreshold =
          visibilitySnapshot.visibleTrackedCount >=
            SOAK_MIN_VISIBLE_TRACKED_SYMBOLS &&
          visibilitySnapshot.visiblePanelCSymbolCount >=
            SOAK_MIN_VISIBLE_PANEL_C_SYMBOLS;

        consecutiveVisibleSamples = meetsVisibilityThreshold
          ? consecutiveVisibleSamples + 1
          : 0;
        maxConsecutiveVisibleSamples = Math.max(
          maxConsecutiveVisibleSamples,
          consecutiveVisibleSamples,
        );

        if (
          !capturedWindowScreenshot &&
          consecutiveVisibleSamples >= SOAK_REQUIRED_CONSECUTIVE_VISIBLE_SAMPLES
        ) {
          capturedWindowScreenshot = true;

          expect(visibilitySnapshot.visiblePanelCSymbolCount).toBeGreaterThan(0);

          const elapsedSeconds = Math.min(
            60,
            Math.max(1, Math.ceil((Date.now() - soakStart) / 1000)),
          );

          const windowVisibleSymbols = [...trackedVisibleSymbols].sort();
          proofTimeline.push({
            windowIndex: iterationCount + 1,
            elapsedSeconds,
            visiblePanelCSymbolCount: visibilitySnapshot.visiblePanelCSymbolCount,
            visiblePanelCSymbols: [...visibilitySnapshot.visiblePanelCSymbols].sort(),
            visibleTrackedCount: visibilitySnapshot.visibleTrackedCount,
            visibleTrackedSymbols: windowVisibleSymbols,
          });

          const screenshotPath = testInfo.outputPath(
            `panel-c-window-${String(elapsedSeconds).padStart(2, "0")}s-${String(iterationCount + 1).padStart(2, "0")}.png`,
          );

          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
          });

          await testInfo.attach(
            `panel-c-window-${String(elapsedSeconds).padStart(2, "0")}s`,
            {
              path: screenshotPath,
              contentType: "image/png",
            },
          );
        }

        await page.waitForTimeout(SOAK_SAMPLE_INTERVAL_MS);
      }
      iterationCount += 1;

      expect(maxConsecutiveVisibleSamples).toBeGreaterThanOrEqual(
        SOAK_REQUIRED_CONSECUTIVE_VISIBLE_SAMPLES,
      );
      expect(visibleThisWindow.size).toBeGreaterThanOrEqual(
        SOAK_MIN_VISIBLE_TRACKED_SYMBOLS,
      );
    }

    expect(Array.from(observedVisibleSymbols).sort()).toEqual(
      [...expectedTrackedSymbols].sort(),
    );

    await testInfo.attach("panel-c-flow-timeline", {
      body: Buffer.from(JSON.stringify(proofTimeline, null, 2)),
      contentType: "application/json",
    });

    expect(iterationCount).toBeGreaterThan(0);
  });

  test("re-syncs cached container height after a Panel C-only reflow", async ({
    page,
  }, testInfo) => {
    test.skip(
      !chromiumProjects.has(testInfo.project.name),
      "This desktop contract only runs on the Chromium gameplay project.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await page.locator("#panel-c .falling-symbol").first().waitFor({
      state: "visible",
      timeout: 10000,
    });

    const result = await page.evaluate(async () => {
      const state = window.__symbolRainState;
      const panel = document.getElementById("panel-c");
      const rain = document.getElementById("symbol-rain-container");

      if (!state || !panel || !rain) {
        return null;
      }

      panel.style.height = "340px";
      await new Promise((resolve) => window.setTimeout(resolve, 400));

      const rainRect = rain.getBoundingClientRect();

      return {
        cachedContainerHeight: state.cachedContainerHeight,
        actualRainHeight: rainRect.height,
      };
    });

    expect(result).not.toBeNull();
    expect(
      Math.abs(result.cachedContainerHeight - result.actualRainHeight),
    ).toBeLessThanOrEqual(2);
  });
});
