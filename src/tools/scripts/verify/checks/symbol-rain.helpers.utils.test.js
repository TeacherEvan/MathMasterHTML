import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const symbolRainHelpersUtilsScriptPath = resolve(
  __dirname,
  "../../../../scripts/symbol-rain.helpers.utils.js",
);
const symbolRainHelpersUtilsSource = readFileSync(
  symbolRainHelpersUtilsScriptPath,
  "utf8",
);

function loadSymbolRainHelpers(overrides = {}) {
  const context = vm.createContext({
    console,
    window: {
      SymbolRainHelpers: overrides.SymbolRainHelpers,
    },
  });

  vm.runInContext(symbolRainHelpersUtilsSource, context, {
    filename: symbolRainHelpersUtilsScriptPath,
  });

  return context.window.SymbolRainHelpers;
}

function createSymbol({ y = 0, top = 0 } = {}) {
  return {
    y,
    element: {
      isConnected: true,
      classList: {
        contains: () => false,
      },
      getBoundingClientRect: () => ({
        top,
        bottom: top + 42,
        left: 0,
        right: 42,
        width: 42,
        height: 42,
      }),
    },
  };
}

test("isSymbolPastRainWindow falls back to cached height when rain rect is unavailable", () => {
  const helpers = loadSymbolRainHelpers();
  const state = {
    cachedContainerHeight: 320,
    symbolRainContainer: {
      getBoundingClientRect: () => ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
      }),
    },
  };

  assert.equal(
    helpers.isSymbolPastRainWindow(state, createSymbol({ y: 371 }), 50),
    true,
  );
  assert.equal(
    helpers.isSymbolPastRainWindow(state, createSymbol({ y: 369 }), 50),
    false,
  );
});

test("isSymbolPastRainWindow stays conservative before any cached height exists", () => {
  const helpers = loadSymbolRainHelpers();
  const state = {
    cachedContainerHeight: 0,
    symbolRainContainer: {
      getBoundingClientRect: () => ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
      }),
    },
  };

  assert.equal(
    helpers.isSymbolPastRainWindow(state, createSymbol({ y: 999 }), 50),
    false,
  );
});