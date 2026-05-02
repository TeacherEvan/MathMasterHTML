import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

function normalizeSymbolText(value) {
  const normalized = String(value || "").trim();
  return normalized === "x" ? "X" : normalized;
}

const MID_GAME_TARGET_PANEL_C_WAIT_MS = 45000;
const MID_GAME_MIN_VISIBLE_PANEL_C_TARGETS = 20;

async function attachPanelCProof(page, testInfo, name, metadata = {}) {
  const screenshot = await page.screenshot();

  await testInfo.attach(name, {
    body: screenshot,
    contentType: "image/png",
  });

  if (Object.keys(metadata).length > 0) {
    await testInfo.attach(`${name}-metadata`, {
      body: Buffer.from(JSON.stringify(metadata, null, 2)),
      contentType: "application/json",
    });
  }
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
        document.querySelectorAll(
          '#panel-c [data-symbol-state="visible"]:not(.clicked)',
        ),
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
      document.querySelectorAll(
        '#panel-c [data-symbol-state="visible"]:not(.clicked)',
      ),
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

    Array.from(
      document.querySelectorAll(
        '#panel-c [data-symbol-state="visible"]:not(.clicked)',
      ),
    )
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

async function countVisiblePanelCTargets(page) {
  return page.evaluate(() => {
    let visibleTargetCount = 0;

    Array.from(
      document.querySelectorAll(
        '#panel-c [data-symbol-state="visible"]:not(.clicked)',
      ),
    )
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
          visibleTargetCount += 1;
        }
      });

    return visibleTargetCount;
  });
}

async function getVisiblePanelCSymbolSummary(page, hiddenSymbols = []) {
  return page.evaluate((currentHiddenSymbols) => {
    const normalize = (value) => {
      const normalized = String(value || "").trim();
      return normalized === "x" ? "X" : normalized;
    };
    const hiddenSet = new Set(currentHiddenSymbols.map((symbol) => normalize(symbol)));
    const visibleSymbols = [];

    Array.from(
      document.querySelectorAll(
        '#panel-c [data-symbol-state="visible"]:not(.clicked)',
      ),
    )
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
          visibleSymbols.push(normalize(element.textContent));
        }
      });

    const distractorCount = visibleSymbols.filter(
      (symbol) => !hiddenSet.has(symbol),
    ).length;
    const matchingCount = visibleSymbols.length - distractorCount;

    return {
      visibleCount: visibleSymbols.length,
      distractorCount,
      matchingCount,
      distinctVisibleSymbols: [...new Set(visibleSymbols)],
    };
  }, hiddenSymbols);
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

test.describe("Symbol rain live targets", () => {
  const chromiumProjects = new Set(["chromium", "qa-matrix-chromium"]);
  const soakProjects = new Set(["qa-matrix-chromium", "qa-soak-webkit", "qa-soak-firefox"]);

  test("keeps a mixed visible Panel C symbol field on desktop gameplay", async ({
    page,
  }, testInfo) => {
    test.skip(
      !chromiumProjects.has(testInfo.project.name),
      "This desktop contract only runs on the Chromium gameplay project.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const before = await getCurrentStepSnapshot(page);

    await expect
      .poll(async () => getVisiblePanelCSymbolSummary(page, before.hiddenSymbols), {
        timeout: 10000,
      })
      .toMatchObject({
        visibleCount: expect.any(Number),
        distractorCount: expect.any(Number),
      });

    const summary = await getVisiblePanelCSymbolSummary(page, before.hiddenSymbols);

    expect(summary.visibleCount).toBeGreaterThanOrEqual(3);
    expect(summary.distractorCount).toBeGreaterThan(0);

    await attachPanelCProof(page, testInfo, "desktop-mixed-visible-field", {
      hiddenSymbols: before.hiddenSymbols.map((symbol) => normalizeSymbolText(symbol)),
      summary,
    });
  });

  test("collects a matching desktop Panel C symbol when one is visible", async ({
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

    const spawned = await spawnVisiblePanelCSymbol(page, targetSymbol);
    expect(spawned).toBe(true);

    await expect
      .poll(async () => hasVisibleMatchingSymbol(page, targetSymbol), {
        timeout: 5000,
      })
      .toBe(true);

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

    await attachPanelCProof(page, testInfo, "desktop-visible-match-collection", {
      targetSymbol: normalizeSymbolText(targetSymbol),
    });
  });

  test("mid game targetpanl-c-verification @soak", async ({
    page,
  }, testInfo) => {
    test.skip(
      !soakProjects.has(testInfo.project.name),
      "This soak contract only runs on the Chromium, WebKit, and Firefox gameplay projects.",
    );

    test.setTimeout(90000);

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    await page.waitForTimeout(MID_GAME_TARGET_PANEL_C_WAIT_MS);

    const visibleTargetCount = await countVisiblePanelCTargets(page);

    await attachPanelCProof(page, testInfo, "mid-game-targetpanl-c-verification", {
      elapsedSeconds: MID_GAME_TARGET_PANEL_C_WAIT_MS / 1000,
      minimumVisibleTargets: MID_GAME_MIN_VISIBLE_PANEL_C_TARGETS,
      visibleTargetCount,
    });

    await page.waitForTimeout(2000);

    const delayedVisibleTargetCount = await countVisiblePanelCTargets(page);

    await attachPanelCProof(page, testInfo, "mid-game-targetpanl-c-verification-plus-2s", {
      elapsedSeconds: MID_GAME_TARGET_PANEL_C_WAIT_MS / 1000 + 2,
      minimumVisibleTargets: MID_GAME_MIN_VISIBLE_PANEL_C_TARGETS,
      visibleTargetCount: delayedVisibleTargetCount,
    });

    expect(visibleTargetCount).toBeGreaterThanOrEqual(
      MID_GAME_MIN_VISIBLE_PANEL_C_TARGETS,
    );
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

    await page.locator('#panel-c [data-symbol-state="visible"]').first().waitFor({
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
      await new Promise((resolve) => window.setTimeout(resolve, 400));

      const rainRect = rain.getBoundingClientRect();

      return {
        cachedContainerHeight:
          window.SymbolRainController?.getSnapshot?.()?.cachedContainerHeight,
        actualRainHeight: rainRect.height,
      };
    });

    expect(result).not.toBeNull();
    expect(
      Math.abs(result.cachedContainerHeight - result.actualRainHeight),
    ).toBeLessThanOrEqual(2);

    await attachPanelCProof(page, testInfo, "panel-c-reflow-proof", result);
  });
});
