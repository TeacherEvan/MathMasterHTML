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
      .map((element) => element.textContent?.trim())
      .filter(Boolean);

    return { stepIndex, hiddenSymbols };
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findVisibleMatchingSymbol(page, symbols, timeoutMs = 3500) {
  const candidates = Array.isArray(symbols) ? symbols.filter(Boolean) : [symbols].filter(Boolean);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const visibleSymbols = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"))
        .map((element) => element.textContent?.trim())
        .filter(Boolean),
    );

    const match = candidates.find((symbol) => visibleSymbols.includes(symbol));
    if (match) {
      return match;
    }

    await page.waitForTimeout(100);
  }

  return null;
}

async function clickLiveMatchingSymbol(page, symbolText, timeoutMs = 3500) {
  const deadline = Date.now() + timeoutMs;
  const exactText = new RegExp(`^${escapeRegExp(symbolText)}$`);

  while (Date.now() < deadline) {
    const symbolLocator = page
      .locator("#panel-c .falling-symbol:not(.clicked)")
      .filter({ hasText: exactText })
      .last();

    if ((await symbolLocator.count()) > 0) {

      try {
        await symbolLocator.dispatchEvent("pointerdown", {
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
        return true;
      } catch {
        // Symbols move quickly on mobile; retry until the deadline expires.
      }
    }

    await page.waitForTimeout(100);
  }

  return false;
}

test.describe("Symbol rain mobile interactions", () => {
  test("only slows a mobile symbol when the blocking neighbor is below it", async ({
    page,
  }) => {
    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => Boolean(window.SymbolRainHelpers && window.SymbolRainConfig),
      { timeout: 10000 },
    );

    const collisionState = await page.evaluate(() => {
      const spatialGrid = window.SymbolRainHelpers.createSpatialGrid(
        window.SymbolRainConfig,
      );
      const current = {
        x: 120,
        y: 100,
        isInFaceReveal: false,
      };
      const above = {
        x: 126,
        y: 82,
        isInFaceReveal: false,
      };
      const below = {
        x: 126,
        y: 118,
        isInFaceReveal: false,
      };

      spatialGrid.update([current, above]);
      const aboveConflict = window.SymbolRainHelpers.checkCollision(
        {
          config: window.SymbolRainConfig,
          isMobileMode: true,
          spatialGrid,
        },
        current,
      );

      spatialGrid.update([current, below]);
      const belowConflict = window.SymbolRainHelpers.checkCollision(
        {
          config: window.SymbolRainConfig,
          isMobileMode: true,
          spatialGrid,
        },
        current,
      );

      return { aboveConflict, belowConflict };
    });

    expect(collisionState.aboveConflict).toBe(false);
    expect(collisionState.belowConflict).toBe(true);
  });

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

  test("shows a live falling symbol in Panel C after gameplay becomes interactive", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This contract is only enforced on the mobile projects.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await expect(page.locator("#panel-c")).toBeVisible();
    await page.locator("#panel-c .falling-symbol").first().waitFor({
      state: "visible",
      timeout: 4000,
    });

    const visibilitySamples = await page.evaluate(async () => {
      const samples = [];

      for (let index = 0; index < 6; index += 1) {
        const visibleSymbols = Array.from(
          document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"),
        ).filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight;
        });

        samples.push(visibleSymbols.length);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }

      return samples;
    });

    expect(visibilitySamples.some((count) => count >= 2)).toBe(true);
    expect(visibilitySamples.at(-1)).toBeGreaterThan(0);
  });

  test("keeps live Panel C targets visible in an Android WebView-like runtime", async ({
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

    const startButton = page.locator("#start-game-btn");
    if (await startButton.isVisible()) {
      await startButton.click({ force: true });
    }

    await page.waitForFunction(() => {
      const state = window.displayManager?.getCurrentResolution?.();

      return (
        state?.isCompactViewport === true &&
        document.body.classList.contains("viewport-compact")
      );
    }, { timeout: 10000 });

    await page.locator("#panel-c .falling-symbol").first().waitFor({
      state: "visible",
      timeout: 10000,
    });

    await context.close();
  });

  test("forced Evan boot keeps rain visible while gameplay input is locked", async ({
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
      const firstSymbol = document.querySelector("#panel-c .falling-symbol");
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
    const targetSymbol = await findVisibleMatchingSymbol(page, before.hiddenSymbols);

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
          .map((element) => element.textContent?.trim())
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

    await page.waitForFunction(
      (symbols) => {
        const liveSymbols = Array.from(
          document.querySelectorAll("#panel-c .falling-symbol:not(.clicked)"),
        )
          .map((element) => element.textContent?.trim())
          .filter(Boolean);

        return symbols.some((symbol) => liveSymbols.includes(symbol));
      },
      before.hiddenSymbols,
      { timeout: 5000 },
    );

    const panelC = page.locator("#panel-c");
    await panelC.focus();
    await expect(panelC).toBeFocused();
    await page.keyboard.press("Enter");

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
          .map((element) => element.textContent?.trim())
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

  test("keeps the active hidden symbol raining as a live Panel C target on mobile", async ({
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

    for (let revealIndex = 0; revealIndex < 5; revealIndex += 1) {
      const before = await getCurrentStepSnapshot(page);
      const targetSymbol = before.hiddenSymbols[0];

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
            .map((element) => element.textContent?.trim())
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
});
