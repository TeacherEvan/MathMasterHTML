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
      .map((element) => element.textContent?.trim())
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

test.describe("Symbol rain live targets", () => {
  test("keeps the active hidden symbol raining as a live Panel C target on desktop gameplay", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
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
