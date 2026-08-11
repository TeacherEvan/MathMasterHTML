// TDD: Life Stats aggregation engine — logic tests
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AGG_PATH = resolve(__dirname, "../../../../scripts/life-stats/life-stats-aggregate.js");

function loadAggregate() {
  const context = vm.createContext({ console, Math, Date, window: {} });
  vm.runInContext(readFileSync(AGG_PATH, "utf8"), context, { filename: AGG_PATH });
  return context.window.LifeStatsAggregate;
}

// Build entries around a fixed "now"
function entries(records, now) {
  return records.map((r, i) => ({
    id: "e" + i,
    fieldKey: r[0],
    value: r[1],
    note: r[2] || "",
    ts: now - (r[3] || 0),
  }));
}

const DAY = 86400000;

test("range keys map to expected bucket counts", () => {
  const A = loadAggregate();
  const expected = {
    "1d": 24,
    "1w": 7,
    "1mo": 30,
    "4mo": 4,
    "6mo": 6,
    "8mo": 8,
    "12mo": 12,
    "48mo": 16,
    "96mo": 32,
    "212mo": 18,
  };
  const now = Date.now();
  const someEntries = entries([["income", 10, "", 0]], now);
  for (const [range, count] of Object.entries(expected)) {
    const { buckets } = A.aggregate(someEntries, {}, range, now);
    assert.equal(buckets.length, count, `range ${range} should have ${count} buckets`);
  }
});

test("entries are summed into the correct bucket per field", () => {
  const A = loadAggregate();
  const now = Date.now();
  // two income entries in the same day bucket, one expense in same day
  const recs = [
    ["income", 100, "", 0],
    ["income", 50, "", 1],
    ["expenses", 30, "", 2],
  ];
  const { buckets, series } = A.aggregate(entries(recs, now), { income: {}, expenses: {} }, "1w", now);
  // most recent bucket (bucket index = last) holds today's sums
  const last = buckets[buckets.length - 1];
  assert.equal(last.totals.income, 150, "income summed");
  assert.equal(last.totals.expenses, 30, "expense summed");
  assert.equal(series.income[series.income.length - 1], 150);
});

test("missing buckets are preserved as gaps (undefined), not zero-faked", () => {
  const A = loadAggregate();
  const now = Date.now();
  // only one entry, 10 days ago → only that bucket should be defined; others gap
  const recs = [["income", 12, "", 10 * DAY]];
  const { buckets } = A.aggregate(entries(recs, now), { income: {} }, "1mo", now);
  const defined = buckets.filter((b) => b.totals.income !== undefined);
  assert.equal(defined.length, 1, "exactly one bucket has data");
  assert.equal(defined[0].totals.income, 12, "the single in-range bucket holds the value");
});

test("rollups compute latest/avg/min/max/net per field", () => {
  const A = loadAggregate();
  const now = Date.now();
  const recs = [
    ["health", 40, "", 20 * DAY],
    ["health", 60, "", 10 * DAY],
    ["health", 80, "", 0],
  ];
  const { rollups } = A.aggregate(entries(recs, now), { health: {} }, "1mo", now);
  const h = rollups.health;
  assert.equal(h.latest, 80);
  assert.equal(h.min, 40);
  assert.equal(h.max, 80);
  assert.equal(h.avg, 60);
  // net = latest - earliest-in-range
  assert.equal(h.net, 40);
});

test("window takes only entries within the range (drops older)", () => {
  const A = loadAggregate();
  const now = Date.now();
  const recs = [
    ["income", 5, "", 400 * DAY], // far outside 1mo
    ["income", 9, "", 0],
  ];
  const { buckets, rollups } = A.aggregate(entries(recs, now), { income: {} }, "1mo", now);
  const totalInRange = buckets.reduce((s, b) => s + (b.totals.income || 0), 0);
  assert.equal(totalInRange, 9, "outside-range entry excluded from sums");
  assert.equal(rollups.income.latest, 9);
});
