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
    handleRandomSpawns: context.window.SymbolRainSpawn.handleRandomSpawns,
    startGuaranteedSpawnController:
      context.window.SymbolRainSpawn.startGuaranteedSpawnController,
  };
}

test("startGuaranteedSpawnController stays inert when needed-symbol guarantees are disabled", () => {
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
    createFallingSymbol: () => null,
    isColumnCrowded: () => false,
    isSymbolVisibleInRainWindow: () => false,
  };

  const runtime = loadSymbolRainSpawnRuntime({
    hiddenSymbols,
    now: 10_000,
    SymbolRainHelpers,
  });

  runtime.startGuaranteedSpawnController(state);

  assert.equal(runtime.getIntervalCallback(), null);
  assert.equal(state.guaranteedSpawnControllerId, 0);
});

test("visible rain floor fills from the general symbol pool without prioritizing needed symbols", () => {
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
      spawnRate: 0,
      burstSpawnRate: 0,
      minVisibleSymbols: 2,
      guaranteedSpawnInterval: 5000,
      maxActiveSymbols: 200,
      symbolHeight: 42,
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
    cachedContainerHeight: 320,
  };

  const SymbolRainHelpers = {
    cleanupSymbolObject: () => {},
    createFallingSymbol: (spawnContext, options) => {
      createdSymbols.push(options.forcedSymbol);
      const rect = {
        top: 285,
        bottom: 327,
        left: 0,
        right: 42,
        width: 42,
        height: 42,
      };
      const symbolObj = {
        symbol: options.forcedSymbol,
        column: options.column,
        y: options.initialY ?? 0,
        element: {
          isConnected: true,
          classList: { contains: () => false },
          getBoundingClientRect: () => rect,
        },
      };
      spawnContext.activeFallingSymbols.push(symbolObj);
      spawnContext.lastSymbolSpawnTimestamp[options.forcedSymbol] = 10_000;
      return symbolObj;
    },
    getRainWindowRect: () => ({
      top: 0,
      bottom: 320,
      left: 0,
      right: 200,
      width: 200,
      height: 320,
    }),
    isColumnCrowded: () => false,
    isSymbolVisibleInRainWindow: () => true,
  };

  const runtime = loadSymbolRainSpawnRuntime({
    hiddenSymbols,
    now: 10_000,
    SymbolRainHelpers,
  });

  runtime.handleRandomSpawns(state);

  assert.deepEqual(createdSymbols, ["1", "1"]);
});