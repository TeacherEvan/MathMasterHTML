import { devices, expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
  stopEvanHelpIfActive,
} from "./utils/onboarding-runtime.js";

test.use({
  ...devices["Pixel 7"],
  viewport: { width: 915, height: 412 },
  screen: { width: 915, height: 412 },
});

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSymbolText(value) {
  const normalized = String(value || "").trim();
  return normalized === "x" ? "X" : normalized;
}

async function findVisibleMatchingSymbol(page, symbols, timeoutMs = 3500) {
  const candidates = (Array.isArray(symbols) ? symbols : [symbols])
    .filter(Boolean)
    .map((symbol) => normalizeSymbolText(symbol));
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const visibleSymbols = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '#panel-c [data-symbol-state="visible"]:not(.clicked)',
        ),
      )
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

async function clickLiveMatchingSymbol(page, symbolText, timeoutMs = 3500) {
  const deadline = Date.now() + timeoutMs;
  const normalizedTarget = normalizeSymbolText(symbolText);

  while (Date.now() < deadline) {
    const clicked = await page.evaluate((targetSymbol) => {
      const normalize = (value) => {
        const normalized = String(value || "").trim();
        return normalized === "x" ? "X" : normalized;
      };
      const candidates = Array.from(
        document.querySelectorAll(
          '#panel-c [data-symbol-state="visible"]:not(.clicked)',
        ),
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
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: 1,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
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

async function spawnVisiblePanelCSymbol(page, symbolText, column = 0) {
  return page.evaluate(({ forcedSymbol, targetColumn }) => {
    return Boolean(
      window.SymbolRainController?.spawnVisibleSymbol?.(forcedSymbol, {
        column: targetColumn,
        horizontalOffset: 0,
      }),
    );
  }, { forcedSymbol: symbolText, targetColumn: column });
}

async function markLatestVisiblePanelCSymbol(page, symbolText) {
  const normalizedTarget = normalizeSymbolText(symbolText);

  return page.evaluate((targetSymbol) => {
    const normalize = (value) => {
      const normalized = String(value || "").trim();
      return normalized === "x" ? "X" : normalized;
    };

    const matchingElements = Array.from(
      document.querySelectorAll(
        '#panel-c [data-symbol-state="visible"]:not(.clicked)',
      ),
    ).filter((element) => normalize(element.textContent) === targetSymbol);

    const trackedElement = matchingElements.at(-1);
    if (!trackedElement) {
      return null;
    }

    trackedElement.dataset.testTracked = "true";
    const rect = trackedElement.getBoundingClientRect();

    return {
      symbol: normalize(trackedElement.textContent),
      state: trackedElement.dataset.symbolState || "",
      top: rect.top,
      left: rect.left,
    };
  }, normalizedTarget);
}

async function readTrackedPanelCSymbol(page) {
  return page.evaluate(() => {
    const trackedElement = document.querySelector(
      '#panel-c [data-test-tracked="true"]',
    );

    if (!trackedElement) {
      return null;
    }

    const rect = trackedElement.getBoundingClientRect();

    return {
      state: trackedElement.dataset.symbolState || "",
      top: rect.top,
      left: rect.left,
      text: trackedElement.textContent?.trim() || "",
    };
  });
}

async function markFirstVisiblePanelCSymbol(page) {
  return page.evaluate(() => {
    const trackedElement = document.querySelector(
      '#panel-c [data-symbol-state="visible"]:not(.clicked)',
    );

    if (!trackedElement) {
      return null;
    }

    trackedElement.dataset.testTracked = "true";
    const rect = trackedElement.getBoundingClientRect();

    return {
      state: trackedElement.dataset.symbolState || "",
      top: rect.top,
      left: rect.left,
      text: trackedElement.textContent?.trim() || "",
    };
  });
}

async function getVisiblePanelCSymbolSummary(page, hiddenSymbols = []) {
  return page.evaluate((currentHiddenSymbols) => {
    const normalize = (value) => {
      const normalized = String(value || "").trim();
      return normalized === "x" ? "X" : normalized;
    };

    const hiddenSet = new Set(
      currentHiddenSymbols.map((symbol) => normalize(symbol)),
    );
    const visibleSymbols = [];

    Array.from(
      document.querySelectorAll(
        '#panel-c [data-symbol-state="visible"]:not(.clicked)',
      ),
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

      if (intersectsPanel) {
        visibleSymbols.push(normalize(element.textContent));
      }
    });

    const distractorCount = visibleSymbols.filter(
      (symbol) => !hiddenSet.has(symbol),
    ).length;

    return {
      visibleCount: visibleSymbols.length,
      distractorCount,
      distinctVisibleSymbols: [...new Set(visibleSymbols)],
    };
  }, hiddenSymbols);
}

test.describe("Symbol rain mobile interactions", () => {
  test("keeps responding to successive taps after pointer release", async ({
    page,
  }) => {
    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    const startButton = page.locator("#start-game-btn");
    if (await startButton.isVisible()) {
      await startButton.click({ force: true });
    }

    await page.waitForSelector("#symbol-rain-container");

    await page.evaluate(() => {
      window.__rainTapCount = 0;
      window.SymbolRainHelpers.handleSymbolClick = () => {
        window.__rainTapCount += 1;
      };

      const container = document.getElementById("symbol-rain-container");
      container
        .querySelectorAll(".test-falling-symbol")
        .forEach((node) => node.remove());

      ["5", "x"].forEach((text, index) => {
        const symbol = document.createElement("div");
        symbol.className = "falling-symbol test-falling-symbol";
        symbol.textContent = text;
        symbol.dataset.symbolState = "visible";
        symbol.setAttribute("data-symbol-state", "visible");
        symbol.style.position = "absolute";
        symbol.style.left = `${40 + index * 72}px`;
        symbol.style.top = "48px";
        container.appendChild(symbol);
      });
    });

    const first = page.locator(".test-falling-symbol").nth(0);
    const second = page.locator(".test-falling-symbol").nth(1);

    await first.dispatchEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });
    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: 0,
        }),
      );
    });

    await second.dispatchEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });

    const tapCount = await page.evaluate(() => window.__rainTapCount);
    expect(tapCount).toBe(2);
  });

  test("keeps a live Panel C symbol stationary before fading and resurfacing", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This contract is only enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await expect(page.locator("#panel-c")).toBeVisible();
    await page.locator('#panel-c [data-symbol-state="visible"]').first().waitFor({
      state: "visible",
      timeout: 4000,
    });

    const tracked = await markFirstVisiblePanelCSymbol(page);
    expect(tracked).not.toBeNull();
    expect(tracked.state).toBe("visible");

    const positionSamples = [];
    for (let sampleIndex = 0; sampleIndex < 4; sampleIndex += 1) {
      const sample = await readTrackedPanelCSymbol(page);
      expect(sample).not.toBeNull();
      positionSamples.push(sample.top);
      await page.waitForTimeout(300);
    }

    const initialTop = positionSamples[0];
    const maxDrift = Math.max(
      ...positionSamples.map((sampleTop) => Math.abs(sampleTop - initialTop)),
    );

    expect(maxDrift).toBeLessThanOrEqual(2);

    await expect
      .poll(async () => {
        const sample = await readTrackedPanelCSymbol(page);
        return sample?.state;
      }, { timeout: 5000 })
      .toBe("hidden");

    await expect
      .poll(async () => {
        const sample = await readTrackedPanelCSymbol(page);
        return sample?.state;
      }, { timeout: 10000 })
      .toBe("visible");

    const resurfaced = await readTrackedPanelCSymbol(page);
    expect(resurfaced).not.toBeNull();
    expect(resurfaced.state).toBe("visible");
    expect(
      Math.abs(resurfaced.top - tracked.top) +
        Math.abs(resurfaced.left - tracked.left),
    ).toBeGreaterThan(2);
  });

  test("treats only the live Panel C bounds as visible after Panel C reflow", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This contract is only enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await page.locator("#panel-c .falling-symbol").first().waitFor({
      state: "visible",
      timeout: 10000,
    });

    const result = await page.evaluate(async () => {
      const panel = document.getElementById("panel-c");
      const rain = document.getElementById("symbol-rain-container");

      if (!panel || !rain) {
        return null;
      }

      panel.style.height = "340px";
      await new Promise((resolve) => window.setTimeout(resolve, 500));

      const panelRect = panel.getBoundingClientRect();
      const rainRect = rain.getBoundingClientRect();
      const staleVisibleSymbols = Array.from(
        document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        const intersectsPanel =
          rect.bottom > panelRect.top &&
          rect.top < panelRect.bottom &&
          rect.right > panelRect.left &&
          rect.left < panelRect.right;
        const intersectsRain =
          rect.bottom > rainRect.top &&
          rect.top < rainRect.bottom &&
          rect.right > rainRect.left &&
          rect.left < rainRect.right;

        return intersectsPanel && !intersectsRain;
      }).length;

      return {
        cachedContainerHeight:
          window.SymbolRainController?.getSnapshot?.()?.cachedContainerHeight,
        actualRainHeight: rainRect.height,
        staleVisibleSymbols,
      };
    });

    expect(result).not.toBeNull();
    expect(
      Math.abs(result.cachedContainerHeight - result.actualRainHeight),
    ).toBeLessThanOrEqual(2);
    expect(result.staleVisibleSymbols).toBe(0);
  });

  test("keeps resurfacing targets stationary until they fade in an Android WebView-like runtime", async ({
    browser,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Manual WebView context contract runs on the chromium project only.",
    );

    const context = await browser.newContext({
      viewport: { width: 980, height: 735 },
      screen: { width: 980, height: 735 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2.625,
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (query === "(hover: none) and (pointer: coarse)") {
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          };
        }

        return originalMatchMedia(query);
      };
    });

    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await page.waitForFunction(() => {
      const state = window.displayManager?.getCurrentResolution?.();

      return (
        state?.isCompactViewport === true &&
        document.body.classList.contains("viewport-compact")
      );
    }, { timeout: 10000 });

    const runtimeConfig = await page.evaluate(() => {
      const snapshot = window.SymbolRainController?.getSnapshot?.();
      return {
        fadeMs: snapshot?.config?.fadeMs,
        isMobileMode: snapshot?.isMobileMode,
        instancesPerSymbol: snapshot?.config?.instancesPerSymbol,
        maxActiveSymbols: snapshot?.config?.maxActiveSymbols,
        maxDomElements: snapshot?.config?.maxDomElements,
        minClearancePx: snapshot?.config?.minClearancePx,
        hiddenMaxMs: snapshot?.config?.hiddenMaxMs,
        hiddenMinMs: snapshot?.config?.hiddenMinMs,
        visibleMs: snapshot?.config?.visibleMs,
      };
    });

    expect(runtimeConfig.isMobileMode).toBe(true);
    expect(runtimeConfig.visibleMs).toBe(2000);
    expect(runtimeConfig.fadeMs).toBe(1000);
    expect(runtimeConfig.hiddenMinMs).toBe(2000);
    expect(runtimeConfig.hiddenMaxMs).toBe(7000);
    expect(runtimeConfig.instancesPerSymbol).toBe(5);
    expect(runtimeConfig.minClearancePx).toBe(4);
    expect(runtimeConfig.maxDomElements).toBe(150);
    expect(runtimeConfig.maxActiveSymbols).toBe(150);

    await page.locator("#panel-c .falling-symbol").first().waitFor({
      state: "visible",
      timeout: 10000,
    });

    const tracked = await markFirstVisiblePanelCSymbol(page);
    expect(tracked).not.toBeNull();
    expect(tracked.state).toBe("visible");

    const positionSamples = [];
    for (let sampleIndex = 0; sampleIndex < 4; sampleIndex += 1) {
      const sample = await readTrackedPanelCSymbol(page);
      expect(sample).not.toBeNull();
      positionSamples.push(sample.top);
      await page.waitForTimeout(250);
    }

    const initialTop = positionSamples[0];
    const maxDrift = Math.max(
      ...positionSamples.map((sampleTop) => Math.abs(sampleTop - initialTop)),
    );
    expect(maxDrift).toBeLessThanOrEqual(2);

    await expect
      .poll(async () => {
        const sample = await readTrackedPanelCSymbol(page);
        return sample?.state;
      }, { timeout: 5000 })
      .toBe("hidden");

    await context.close();
  });

  test("keeps standard Panel C tuning in the default desktop runtime", async ({
    browser,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "This scope contract runs on the desktop chromium project only.",
    );

    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
    });
    const page = await context.newPage();

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const runtimeConfig = await page.evaluate(() => {
      const snapshot = window.SymbolRainController?.getSnapshot?.();
      return {
        fadeMs: snapshot?.config?.fadeMs,
        isMobileMode: snapshot?.isMobileMode,
        instancesPerSymbol: snapshot?.config?.instancesPerSymbol,
        maxActiveSymbols: snapshot?.config?.maxActiveSymbols,
        maxDomElements: snapshot?.config?.maxDomElements,
        minClearancePx: snapshot?.config?.minClearancePx,
        hiddenMaxMs: snapshot?.config?.hiddenMaxMs,
        hiddenMinMs: snapshot?.config?.hiddenMinMs,
        visibleMs: snapshot?.config?.visibleMs,
      };
    });

    expect(runtimeConfig.isMobileMode).toBe(false);
    expect(runtimeConfig.visibleMs).toBe(2000);
    expect(runtimeConfig.fadeMs).toBe(1000);
    expect(runtimeConfig.hiddenMinMs).toBe(2000);
    expect(runtimeConfig.hiddenMaxMs).toBe(7000);
    expect(runtimeConfig.instancesPerSymbol).toBe(5);
    expect(runtimeConfig.minClearancePx).toBe(4);
    expect(runtimeConfig.maxDomElements).toBe(150);
    expect(runtimeConfig.maxActiveSymbols).toBe(150);

    await context.close();
  });

  test("forced Evan boot keeps the target field visible while gameplay input is locked", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This contract is only enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await expect(page.locator("#evan-skip-button")).toBeVisible();

    const state = await page.evaluate(async () => {
      const firstSymbol = document.querySelector(
        '#panel-c [data-symbol-state="visible"]',
      );
      return {
        gameplayInputReady:
          window.GameRuntimeCoordinator?.canAcceptGameplayInput?.() ?? null,
        inputLocked:
          window.GameRuntimeCoordinator?.getState?.().inputLocked ?? null,
        rainVisible: Boolean(firstSymbol),
      };
    });

    expect(state.gameplayInputReady).toBe(false);
    expect(state.inputLocked).toBe(true);
    expect(state.rainVisible).toBe(true);
  });

  test("skipping forced Evan restores live Panel C target interaction", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This contract is only enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await stopEvanHelpIfActive(page);

    const before = await getCurrentStepSnapshot(page);
    const targetSymbol = before.hiddenSymbols[0];

    expect(targetSymbol).toBeTruthy();

    const spawned = await spawnVisiblePanelCSymbol(page, targetSymbol);
    expect(spawned).toBe(true);

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
  });

  test("Panel C supports keyboard collection of a visible matching symbol", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This keyboard accessibility contract is enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const before = await getCurrentStepSnapshot(page);
    const targetSymbol = before.hiddenSymbols[0];

    expect(targetSymbol).toBeTruthy();

    const spawned = await spawnVisiblePanelCSymbol(page, targetSymbol);
    expect(spawned).toBe(true);

    const panelC = page.locator("#panel-c");
    await panelC.focus();
    await expect(panelC).toBeFocused();
    await page.waitForFunction(() => {
      const panel = document.getElementById("panel-c");
      const target = document.querySelector(
        "#panel-c .falling-symbol.keyboard-target",
      );

      if (!panel || !target) {
        return false;
      }

      const panelRect = panel.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      return (
        targetRect.bottom > panelRect.top &&
        targetRect.top < panelRect.bottom &&
        targetRect.right > panelRect.left &&
        targetRect.left < panelRect.right
      );
    }, { timeout: 5000 });

    const keyboardTargetText = await page.locator(
      "#panel-c .falling-symbol.keyboard-target",
    ).textContent();
    expect(before.hiddenSymbols.map(normalizeSymbolText)).toContain(
      normalizeSymbolText(keyboardTargetText),
    );

    await page.keyboard.press("Enter");

    await expect
      .poll(async () => {
        const after = await getCurrentStepSnapshot(page);
        return after.hiddenSymbols.length;
      }, { timeout: 5000 })
      .toBeLessThan(before.hiddenSymbols.length);
  });

  test("Panel C reacquires a keyboard target when focus comes before a live match", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This keyboard accessibility contract is enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const before = await getCurrentStepSnapshot(page);
    expect(before.hiddenSymbols.length).toBeGreaterThan(0);

    await page.evaluate((symbols) => {
      window.SymbolRainController?.stop?.("keyboard-target-no-match-setup");
      window.SymbolRainController?.removeMatchingSymbols?.(symbols);
    }, before.hiddenSymbols);

    const keyboardTargetCount = await page.evaluate((symbols) => {
      window.SymbolRainController?.removeMatchingSymbols?.(symbols);

      document.getElementById("panel-c")?.focus();
      window.SymbolRainController?.syncKeyboardTarget?.();
      return document.querySelectorAll(
        "#panel-c .falling-symbol.keyboard-target",
      ).length;
    }, before.hiddenSymbols);

    const panelC = page.locator("#panel-c");
    await expect(panelC).toBeFocused();
    expect(keyboardTargetCount).toBe(0);

    const targetSymbol = before.hiddenSymbols[0];
    expect(targetSymbol).toBeTruthy();

    const spawned = await spawnVisiblePanelCSymbol(page, targetSymbol);
    expect(spawned).toBe(true);

    await page.keyboard.press("ArrowRight");

    await page.waitForFunction(
      (symbols) => {
        const panel = document.getElementById("panel-c");
        const target = document.querySelector(
          "#panel-c .falling-symbol.keyboard-target",
        );

        if (!panel || !target) {
          return false;
        }

        const normalize = (value) => String(value || "").trim().toLowerCase();
        const normalizedSymbols = new Set(symbols.map(normalize));
        const panelRect = panel.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        return (
          normalizedSymbols.has(normalize(target.textContent)) &&
          targetRect.bottom > panelRect.top &&
          targetRect.top < panelRect.bottom &&
          targetRect.right > panelRect.left &&
          targetRect.left < panelRect.right
        );
      },
      before.hiddenSymbols,
      { timeout: 8000 },
    );

    await page.keyboard.press("Enter");

    await expect
      .poll(async () => {
        const after = await getCurrentStepSnapshot(page);
        return after.hiddenSymbols.length;
      }, { timeout: 5000 })
      .toBeLessThan(before.hiddenSymbols.length);
  });

  test("keeps a mixed visible Panel C symbol field on mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This contract is only enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await page.locator("#panel-c .falling-symbol").first().waitFor({
      state: "visible",
      timeout: 10000,
    });

    const before = await getCurrentStepSnapshot(page);

    let summary = null;
    await expect
      .poll(
        async () => {
          summary = await getVisiblePanelCSymbolSummary(page, before.hiddenSymbols);
          return summary.visibleCount >= 8 && summary.distractorCount > 0;
        },
        { timeout: 10000 },
      )
      .toBe(true);

    await testInfo.attach("mobile-mixed-visible-field", {
      body: Buffer.from(JSON.stringify(summary, null, 2)),
      contentType: "application/json",
    });
  });
});
