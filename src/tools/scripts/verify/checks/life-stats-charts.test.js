// TDD: Life Stats SVG chart builders — logic tests (mocked DOM)
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CHART_PATH = resolve(__dirname, "../../../../scripts/life-stats/life-stats-charts.js");

function makeMockDocument() {
  const created = [];
  function createElementNS(ns, name) {
    const attrs = {};
    const children = [];
    const node = {
      nodeName: name,
      ns,
      attributes: attrs,
      children,
      setAttribute: (k, v) => { attrs[k] = v; },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      appendChild: (c) => { children.push(c); return c; },
      set textContent(v) { node._text = v; },
      get textContent() { return node._text || ""; },
    };
    created.push(node);
    return node;
  }
  return { createElementNS, _created: created };
}

function loadCharts() {
  const doc = makeMockDocument();
  const context = vm.createContext({ console, Math, Date, document: doc, window: {} });
  vm.runInContext(readFileSync(CHART_PATH, "utf8"), context, { filename: CHART_PATH });
  return { Charts: context.window.LifeStatsCharts, doc };
}

const DAY = 86400000;
function fakeAgg(now) {
  // 7 daily buckets, 2 fields, with some values
  const buckets = [];
  for (let i = 0; i < 7; i++) {
    buckets.push({ startTs: now - (6 - i) * DAY, endTs: now - (6 - i) * DAY + DAY, totals: {}, counts: {} });
  }
  buckets[6].totals.income = 100;
  buckets[6].totals.expenses = 40;
  return {
    buckets,
    series: {
      income: [undefined, undefined, undefined, undefined, undefined, undefined, 100],
      expenses: [undefined, undefined, undefined, undefined, undefined, undefined, 40],
    },
    rollups: {},
  };
}

test("buildScale maps min->bottom and max->top", () => {
  const { Charts } = loadCharts();
  const s = Charts.buildScale([0, 10, 5], 100, 10);
  assert.equal(s.y(0), 90); // bottom (height - pad)
  assert.equal(s.y(10), 10); // top (pad)
  assert.ok(s.y(5) > 10 && s.y(5) < 90);
});

test("buildSparkline returns an <svg> with role=img and aria-label", () => {
  const { Charts, doc } = loadCharts();
  const svg = Charts.buildSparkline([1, 2, 3, 2], { ariaLabel: "Income sparkline" });
  assert.equal(svg.nodeName, "svg");
  assert.equal(svg.getAttribute("role"), "img");
  assert.equal(svg.getAttribute("aria-label"), "Income sparkline");
  assert.ok(svg.children.length >= 1, "has a polyline");
});

test("buildLine produces an svg with role=img, a <desc>, and a polyline per visible field", () => {
  const { Charts, doc } = loadCharts();
  const agg = fakeAgg(Date.now());
  const svg = Charts.buildLine(agg, { income: { label: "Income" }, expenses: { label: "Expenses" } }, ["income", "expenses"]);
  assert.equal(svg.getAttribute("role"), "img");
  const hasDesc = svg.children.some((c) => c.nodeName === "desc");
  assert.ok(hasDesc, "has <desc>");
  const polylines = svg.children.filter((c) => c.nodeName === "polyline");
  assert.equal(polylines.length, 2, "one polyline per visible field");
  assert.ok(polylines.every((p) => p.getAttribute("stroke")), "stroked");
});

test("buildBar produces <rect> bars only for positive totals", () => {
  const { Charts } = loadCharts();
  const agg = fakeAgg(Date.now());
  const svg = Charts.buildBar(agg, {}, ["income", "expenses"]);
  const rects = svg.children.filter((c) => c.nodeName === "rect");
  assert.ok(rects.length >= 1, "at least one bar rendered");
  assert.ok(rects.every((r) => parseFloat(r.getAttribute("height")) > 0), "positive heights");
});

test("buildDonut renders a segment per non-zero category", () => {
  const { Charts } = loadCharts();
  const svg = Charts.buildDonut({ food: 60, rent: 40, empty: 0 });
  const segs = svg.children.filter((c) => c.nodeName === "circle" && c.getAttribute("data-category"));
  assert.equal(segs.length, 2, "two non-zero categories -> two segments");
});

test("colorFor is deterministic and stable per key", () => {
  const { Charts } = loadCharts();
  assert.equal(Charts.colorFor("income"), Charts.colorFor("income"));
  assert.notEqual(Charts.colorFor("income"), Charts.colorFor("expenses"));
});
