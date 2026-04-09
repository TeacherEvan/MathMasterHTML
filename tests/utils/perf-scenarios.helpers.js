// @ts-check

const WRONG_SYMBOL = "@";
const FALLING_SYMBOL_SELECTOR = "#panel-c .falling-symbol:not(.clicked)";
const HIDDEN_SYMBOL_SELECTOR = "#solution-container .hidden-symbol";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  const exactText = new RegExp(`^${escapeRegExp(symbolText)}$`);

  while (Date.now() < deadline) {
    const matchingSymbols = page
      .locator(FALLING_SYMBOL_SELECTOR)
      .filter({ hasText: exactText });

    if ((await matchingSymbols.count()) > 0) {
      const symbolLocator = matchingSymbols.last();

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
        // Falling symbols move quickly; retry until timeout if this instance moved away.
      }
    }

    await page.waitForTimeout(100);
  }

  return false;
}

export async function dispatchSymbolClickedEvent(page, symbolText) {
  return page.evaluate((symbol) => {
    document.dispatchEvent(
      new CustomEvent("symbolClicked", {
        detail: { symbol },
      }),
    );
    return true;
  }, symbolText);
}

export async function dispatchCorrectSymbolEvents(page, count = 1) {
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

export async function dispatchWrongSymbolEvents(page, count = 1) {
  let dispatches = 0;

  for (let index = 0; index < count; index += 1) {
    await dispatchSymbolClickedEvent(page, WRONG_SYMBOL);
    dispatches += 1;
    await page.waitForTimeout(50);
  }

  return dispatches;
}

export async function dispatchCorrectSymbolClicks(page, count = 1) {
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

export async function dispatchWrongSymbolClicks(page, count = 1) {
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

export async function getLockState(page) {
  return page.evaluate(() => {
    const lockDisplay = document.getElementById("lock-display");
    return {
      level: lockDisplay?.getAttribute("data-lock-level") ?? null,
      moment: lockDisplay?.getAttribute("data-lock-moment") ?? null,
    };
  });
}

export async function getStepSnapshot(page) {
  return getCurrentStepSnapshot(page);
}

export { HIDDEN_SYMBOL_SELECTOR };