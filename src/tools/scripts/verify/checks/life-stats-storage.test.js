// TDD: Life Stats storage layer — logic tests (node:test + vm harness)
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HELPERS_PATH = resolve(__dirname, "../../../../scripts/life-stats/life-stats-storage.helpers.js");
const STORAGE_PATH = resolve(__dirname, "../../../../scripts/life-stats/life-stats-storage.js");

function createLocalStorageMock() {
  const map = new Map();
  return {
    _map: map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function loadStorageRuntime(seedStorage) {
  const localStorageMock = createLocalStorageMock();
  if (seedStorage !== undefined) {
    localStorageMock.setItem("mathmaster_life_stats_v1", JSON.stringify(seedStorage));
  }

  const cryptoMock = {
    randomUUID: () =>
      "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
  };

  const context = vm.createContext({
    console,
    Math,
    Date,
    JSON,
    crypto: cryptoMock,
    localStorage: localStorageMock,
    window: {},
  });

  vm.runInContext(readFileSync(HELPERS_PATH, "utf8"), context, {
    filename: HELPERS_PATH,
  });
  vm.runInContext(readFileSync(STORAGE_PATH, "utf8"), context, {
    filename: STORAGE_PATH,
  });

  return { storage: context.window.LifeStatsStorage, localStorage: localStorageMock };
}

test("init creates a default store when storage is empty", () => {
  const { storage } = loadStorageRuntime();
  storage.init();
  assert.equal(storage.getEntries().length, 0);
  assert.equal(Object.keys(storage.getFields()).length, 6);
});

test("addEntry stores a normalized entry and getEntries returns it", () => {
  const { storage } = loadStorageRuntime();
  storage.init();
  const entry = storage.addEntry({ fieldKey: "income", value: 5000, note: "salary" });
  assert.ok(entry, "entry returned");
  assert.equal(entry.fieldKey, "income");
  assert.equal(entry.value, 5000);
  assert.equal(entry.note, "salary");
  assert.equal(typeof entry.ts, "number");
  assert.equal(storage.getEntries().length, 1);
  assert.equal(storage.getEntries()[0].id, entry.id);
});

test("addEntry rejects non-finite values and adds nothing", () => {
  const { storage } = loadStorageRuntime();
  storage.init();
  const bad = storage.addEntry({ fieldKey: "income", value: "abc" });
  assert.equal(bad, null);
  assert.equal(storage.getEntries().length, 0);
});

test("addEntry rejects unknown fieldKey", () => {
  const { storage } = loadStorageRuntime();
  storage.init();
  const bad = storage.addEntry({ fieldKey: "nonexistent", value: 10 });
  assert.equal(bad, null);
  assert.equal(storage.getEntries().length, 0);
});

test("addCustomField extends the field set and accepts entries for it", () => {
  const { storage } = loadStorageRuntime();
  storage.init();
  storage.addCustomField("savings", { label: "Savings", unit: "THB", kind: "money", higherIsBetter: true });
  assert.ok(storage.getFields().savings, "custom field present");
  const entry = storage.addEntry({ fieldKey: "savings", value: 100 });
  assert.ok(entry, "entry for custom field accepted");
  assert.equal(storage.getEntries().length, 1);
});

test("reset clears entries but keeps fields", () => {
  const { storage } = loadStorageRuntime();
  storage.init();
  storage.addEntry({ fieldKey: "expenses", value: 100 });
  storage.reset();
  assert.equal(storage.getEntries().length, 0);
  assert.equal(Object.keys(storage.getFields()).length, 6);
});

test("setTax / getTax round-trips and records acknowledgement", () => {
  const { storage } = loadStorageRuntime();
  storage.init();
  storage.setTax({
    acknowledged: true,
    questionnaire: { understandsFiling: true, filingFrequency: "annually" },
  });
  const tax = storage.getTax();
  assert.equal(tax.acknowledged, true);
  assert.equal(tax.questionnaire.understandsFiling, true);
  assert.equal(tax.questionnaire.filingFrequency, "annually");
});

test("init migrates a legacy (version-less) partial store without crashing", () => {
  const { storage } = loadStorageRuntime({ fields: { income: { label: "Income" } } });
  storage.init();
  // legacy partial should be normalized: default fields restored, entries array exists
  assert.equal(Object.keys(storage.getFields()).length, 6);
  assert.equal(storage.getEntries().length, 0);
  const entry = storage.addEntry({ fieldKey: "income", value: 1 });
  assert.ok(entry, "can add after migration");
});

test("localStorage failure is swallowed (private-mode safe)", () => {
  const localStorageMock = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  const cryptoMock = { randomUUID: () => "id-x" };
  const context = vm.createContext({
    console,
    Math,
    Date,
    JSON,
    crypto: cryptoMock,
    localStorage: localStorageMock,
    window: {},
  });
  vm.runInContext(readFileSync(HELPERS_PATH, "utf8"), context, { filename: HELPERS_PATH });
  vm.runInContext(readFileSync(STORAGE_PATH, "utf8"), context, { filename: STORAGE_PATH });
  const storage = context.window.LifeStatsStorage;
  assert.doesNotThrow(() => storage.init());
  assert.doesNotThrow(() => storage.addEntry({ fieldKey: "income", value: 5 }));
});
