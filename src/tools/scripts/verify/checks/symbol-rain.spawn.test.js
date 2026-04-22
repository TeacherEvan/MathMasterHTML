import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const symbolRainSpawnScriptPath = resolve(
  __dirname,
  "../../../../scripts/symbol-rain.spawn.js",
);
const symbolRainSpawnSource = readFileSync(symbolRainSpawnScriptPath, "utf8");

function loadSymbolRainSpawnRuntime(overrides = {}) {
  let intervalCallback = null;
  const hiddenSymbols = overrides.hiddenSymbols || [];
  const now = overrides.now || 10_000;
  const math = Object.create(Math);

  math.random = () => 0;

  const context = vm.createContext({
    console,
    Math: math,
    Date: { now: () => now },
    document: {
      querySelectorAll: () => hiddenSymbols,
    },
    setInterval: (callback) => {
      intervalCallback = callback;
      return 1;
    },
    clearInterval: () => {},
    window: {
      SymbolRainHelpers: overrides.SymbolRainHelpers,
      GameSymbolHandlerCore: {
        getCurrentStepIndex: () => 0,
      },
    },
  });

  vm.runInContext(symbolRainSpawnSource, context, {
    filename: symbolRainSpawnScriptPath,
  });

  return {
    getIntervalCallback: () => intervalCallback,
    startGuaranteedSpawnController:
      context.window.SymbolRainSpawn.startGuaranteedSpawnController,
  };
}

test("startGuaranteedSpawnController only guarantees active needed symbols", () => {
  const createdSymbols = [];
  const hiddenSymbols = [
    {
      dataset: { expected: "2" },
      textContent: "2",
    },
  ];

  const state = {
    activeFallingSymbols: [],
    activeFaceReveals: new Set(),
    columnCount: 3,
    config: {
      guaranteedSpawnInterval: 5000,
      maxActiveSymbols: 200,
    },
    guaranteedSpawnControllerId: null,
    lastSymbolSpawnTimestamp: {
      1: 0,
      2: 0,
      3: 0,
    },
    spatialGrid: {},
    symbolPool: {},
    symbolRainContainer: {},
    symbols: ["1", "2", "3"],
  };

  const SymbolRainHelpers = {
    cleanupSymbolObject: () => {},
    createFallingSymbol: (spawnContext, options) => {
      createdSymbols.push(options.forcedSymbol);
      spawnContext.lastSymbolSpawnTimestamp[options.forcedSymbol] = 10_000;
      return { symbol: options.forcedSymbol };
    },
    isColumnCrowded: () => false,
    isSymbolVisibleInRainWindow: () => false,
  };

  const runtime = loadSymbolRainSpawnRuntime({
    hiddenSymbols,
    now: 10_000,
    SymbolRainHelpers,
  });

  runtime.startGuaranteedSpawnController(state);

  const intervalCallback = runtime.getIntervalCallback();

  assert.equal(typeof intervalCallback, "function");

  intervalCallback();

  assert.deepEqual(createdSymbols, ["2"]);
});