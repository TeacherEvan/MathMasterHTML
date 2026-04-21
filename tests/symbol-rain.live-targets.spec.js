import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

function normalizeSymbolText(value) {
  const normalized = String(value || "").trim();
  return normalized === "x" ? "X" : normalized;
}

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

async function getActivePanelCSymbols(page) {
  return page.evaluate(() => {
    const state = window.__symbolRainState;
    if (!state?.activeFallingSymbols?.length) {
      return [];
    }

    return Array.from(
      new Set(
        state.activeFallingSymbols
          .filter((symbolObj) => symbolObj?.element?.isConnected)
          .filter((symbolObj) => !symbolObj.element.classList.contains("clicked"))
          .map((symbolObj) => String(symbolObj.symbol || "").trim())
          .filter(Boolean),
      ),
    );
  });
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
      "This soak contract only runs on the Chromium and WebKit gameplay projects.",
    );

    test.setTimeout(90000);

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const soakDeadline = Date.now() + 60000;
    let iterationCount = 0;
    const observedVisibleSymbols = new Set();
    const useActiveSymbolState = testInfo.project.name !== "qa-matrix-chromium";

    while (Date.now() < soakDeadline) {
      const windowDeadline = Math.min(Date.now() + 5000, soakDeadline);
      const visibleThisWindow = new Set();

      while (Date.now() < windowDeadline) {
        const currentVisibleSymbols = useActiveSymbolState
          ? await getActivePanelCSymbols(page)
          : await getVisiblePanelCSymbols(page);
        currentVisibleSymbols.forEach((symbol) => {
          visibleThisWindow.add(symbol);
          observedVisibleSymbols.add(symbol);
        });

        await page.waitForTimeout(250);
      }
      iterationCount += 1;

      expect(visibleThisWindow.size).toBeGreaterThan(0);
    }

    expect(observedVisibleSymbols.size).toBeGreaterThan(1);
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
