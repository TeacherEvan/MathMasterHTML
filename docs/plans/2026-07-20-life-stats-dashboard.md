# Life Stats Dashboard — Implementation Plan

**Date:** 2026-07-20
**Design:** docs/plans/2026-07-20-life-stats-dashboard-design.md (APPROVED)
**Discipline:** TDD per task — write failing test → watch fail → implement → watch pass → commit.

Each task targets 2–5 minutes of focused work. Files live under `src/scripts/life-stats/` and `src/pages/`. Tests under `tests/life-stats.spec.js`.

---

## T1 — Storage layer
**Test first:** `tests/life-stats.spec.js` (or a logic test) asserting: `addEntry` writes a normalized entry; `getEntries` returns it; `getFields` returns defaults; `addCustomField` persists; `reset` clears; `setTax`/`getTax` round-trip; `migrate` handles v0→v1; `localStorage` failure is swallowed (try/catch).
**Implement:** `src/scripts/life-stats/life-stats-storage.helpers.js` (schema, defaults, `normalizeEntry`, `createDefaultStore`, `migrateStore`) + `src/scripts/life-stats/life-stats-storage.js` (`window.LifeStatsStorage` IIFE: `init`, `addEntry`, `getEntries`, `getFields`, `addCustomField`, `reset`, `setTax`, `getTax`). Mirror `player-storage.js` patterns.
**Verify:** test passes. **Commit.**

## T2 — Aggregation engine
**Test first:** for each range key (`1d,1w,1mo,4mo,6mo,8mo,12mo,48mo,96mo,212mo`) assert: correct bucket count/granularity; sums per field; missing buckets preserved as gaps (not zero); rollups (avg/min/max/net) correct.
**Implement:** `src/scripts/life-stats/life-stats-aggregate.js` (`window.LifeStatsAggregate.window(entries, fields, rangeKey)` → `{buckets, series, rollups}`). Bucket map: 1d=24h, 1w=7d, 1mo=~30d, 4/6/8/12mo=monthly, 48/96mo=quarterly, 212mo=yearly.
**Verify:** test passes. **Commit.**

## T3 — SVG chart builders
**Test first:** `buildLine/burnBar/buildDonut/buildSparkline` return an SVG element (or serializable markup) containing the series paths; each has `<title>`/`<desc>` and `role="img"` + `aria-label`. Assert node counts and that values map to coordinates.
**Implement:** `src/scripts/life-stats/life-stats-charts.js` (`window.LifeStatsCharts`). Pure DOM (`document.createElementNS`), no innerHTML with data. Support line (multi-series + legend toggle), bar (stacked option), donut (composition by `note` category), sparkline (menu).
**Verify:** test passes. **Commit.**

## T4 — Stats board page shell
**Test first:** Playwright — `life-stats.html` loads; the ten range tabs exist; export/seed/reset buttons exist; no CSP violation (page renders scripts).
**Implement:** `src/pages/life-stats.html` (links `src/styles/life-stats.css`; loads storage, helpers, seed, aggregate, charts, export, tax, page scripts `defer`). `src/styles/life-stats.css`. Page bootstrap `src/scripts/life-stats/life-stats-page.core.js`.
**Verify:** test passes (page boots). **Commit.**

## T5 — Stats board render + controls
**Test first:** Playwright — selecting each range tab renders ≥1 `<svg>`; stat cards show latest/avg/min/max/net with ▲/▼; legend toggle hides a series.
**Implement:** `life-stats-page.render.js` (cards + charts from aggregate) + `life-stats-page.controls.js` (range tabs, field filter, re-render on change).
**Verify:** test passes. **Commit.**

## T6 — Logging form
**Test first:** Playwright — open "Add entry" modal; submit field+value+note; entry appears; stat card for that field updates; invalid (non-number) value rejected with feedback.
**Implement:** modal markup in `life-stats.html` + controller in `life-stats-page.controls.js`; calls `LifeStatsStorage.addEntry` then re-render. Support custom-field creation.
**Verify:** test passes. **Commit.**

## T7 — Menu integration
**Test first:** Playwright — `index.html` has "Life Stats" button → navigates to board; `#life-stats-features` panel shows sparklines for top fields when ≥1 entry exists (hidden when empty); button always present.
**Implement:** add button to `.button-container` in `src/pages/index.html`; `life-stats-menu.js` renders sparklines + value/delta chips from `LifeStatsAggregate` over `1w`; load storage/charts/tax scripts there.
**Verify:** test passes. **Commit.**

## T8 — Demo seed
**Test first:** Playwright — "Load demo data" → entries present for all default fields; all ten ranges render charts; re-running is idempotent (no duplicate demo blow-up).
**Implement:** `life-stats-seed.js` (`window.LifeStatsSeed.loadDemoData()`): ~18 months daily realistic entries + sparse back-fill to ~17 yrs for long ranges; clears prior demo first; sets `settings.demoLoaded`.
**Verify:** test passes. **Commit.**

## T9 — Export module
**Test first:** Playwright — JSON download fires (capture blob via download event); CSV download fires; PNG export produces a `.png` file; SVG export produces `.svg`.
**Implement:** `life-stats-export.js` (`window.LifeStatsExport`): `downloadJSON`, `downloadCSV` (UTF-8 BOM), `downloadSVG(activeChart)`, `downloadPNG(activeChart)` (SVG→canvas→toBlob). Wire buttons in board.
**Verify:** test passes. **Commit.**

## T10 — TAX feature
**Test first:** Playwright — `#tax-indicator` present & red on every page; click → modal with "Do you understand tax?" Yes/No; Yes → `tax.acknowledged=true`; badge dims on reload; questionnaire saves; `prefers-reduced-motion` disables pulse (assert steady style).
**Implement:** `life-stats-tax.js` (always-loaded, appends fixed top-right badge to `body`; slow ≤1 Hz pulse via CSS, disabled under reduced-motion; click → `role="dialog" aria-modal` modal: note + Yes/No → educational copy + self-reported questionnaire → `LifeStatsStorage.setTax`). Load on `index.html` and `life-stats.html`.
**Verify:** test passes. **Commit.**

## T11 — Integration & quality gate
**Implement:** ensure CSP unchanged (no inline handlers, same-origin only); run full suite.
**Verify:** `npm run lint` ✓, `npm run typecheck` ✓, `npm run verify` ✓, `npm run test` (life-stats specs) ✓. Fix any failure at root. **Commit.**
**Hand off to Phase 5 (finish branch).**

---

## Notes
- Commit after each green task (frequent commits per skill).
- No new npm deps; no network; CSP stays `default-src 'self'`.
- TAX pulse is a safe slow pulse, not literal flashing (WCAG 2.2 SC 2.3.1) — per approved design deviation.
