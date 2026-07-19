# Life Stats Dashboard & TAX Feature — Design

**Date:** 2026-07-20
**Status:** Draft (pending approval)
**Project:** MathMasterHTML (vanilla JS, offline, no-telemetry, strict CSP `default-src 'self'`)

---

## 1. Goal

Add a personal **Life Stats** tracking subsystem to the existing Math Master game. It lets a user log recurring real-world quantities (Expenses, Income, Risks, Health, Fuel, Transport, …) and inspect them through graphs + a dedicated stats board across ten fixed time ranges. Includes a persistent **TAX** awareness feature and full offline export (JSON/CSV + SVG/PNG).

### Locked decisions (from brainstorm)
- **Zero-dependency**: hand-built SVG charts, `localStorage` persistence, fully offline. No external libs, no CDN, no network. Matches the game's architecture and no-telemetry ethos.
- **Input**: manual entry form (per field) + a "Load demo data" action that seeds realistic history across all ten ranges so the board is evaluable on first open.
- **Export**: data export (JSON + CSV) **and** chart export (SVG + PNG) — full coverage.

---

## 2. Scope (YAGNI — keep tight)

In scope:
- Menu integration (new "Life Stats" entry + mini feature graphs on the menu).
- Stats board page (`/src/pages/life-stats.html`) with the ten time ranges.
- Aggregation/bucketing engine for the listed ranges.
- Logging form + validation + storage.
- Demo seed generator.
- TAX feature (accessible indicator + one-time comprehension modal + questionnaire).
- Export module (JSON/CSV/SVG/PNG) with download triggers.
- Playwright tests for core flows.

Out of scope (explicit non-goals): backend/sync, multi-user, real tax-law computation, auth, paid connectors. The TAX feature is **educational awareness only** — it collects the user's self-reported understanding via a questionnaire and shows generic guidance text; it does **not** file or calculate taxes.

---

## 3. Architecture

Following the project's existing IIFE-module-on-`window` + versioned-`localStorage` + strict-CSP pattern (see `src/scripts/player-storage.js`).

### New files
```
src/scripts/life-stats/
  life-stats-storage.js        # window.LifeStatsStorage (versioned, migrated)
  life-stats-storage.helpers.js# schema, defaults, normalize, migrate
  life-stats-seed.js           # demo data generator
  life-stats-aggregate.js      # windowing + bucketing + rollups
  life-stats-charts.js         # SVG line/bar/donut/sparkline builders
  life-stats-export.js         # JSON/CSV + SVG/PNG download
  life-stats-tax.js            # TAX indicator + modal + questionnaire controller
  life-stats-menu.js           # mini feature graphs on index.html
  life-stats-page.core.js      # stats board page bootstrap
  life-stats-page.controls.js  # range tabs, field filters, export buttons
  life-stats-page.render.js    # render charts + stat cards from aggregated data
src/pages/life-stats.html      # dedicated stats board page
src/styles/life-stats.css      # page + component styles (linked, under CSP)
tests/life-stats.spec.js       # Playwright e2e
```

### Wiring
- `index.html`: add a "Life Stats" button to `.button-container` (sibling of Begin Training / Scoreboard) and a `#life-stats-features` panel with mini sparklines above/below the buttons. Load `life-stats-menu.js` + charts + storage + tax scripts (all `defer`, same-origin, CSP-safe).
- `life-stats.html`: full page; links `life-stats.css`; loads storage, helpers, seed, aggregate, charts, export, tax, page scripts.
- TAX indicator (`#tax-indicator`) is appended to `document.body` on **every** page via a tiny always-loaded `life-stats-tax.js` so it appears "in the right corner of the screen constantly" across the game.

### CSP note
All scripts are same-origin (`/src/scripts/...`), no inline handlers. SVG is built via DOM APIs (not `innerHTML` with remote data), so no CSP relaxation needed. PNG export uses `<canvas>` drawn from the SVG — no extra permissions.

---

## 4. Data model & storage

```js
// STORAGE_KEY = "mathmaster_life_stats_v1"
{
  version: 1,
  fields: {                 // field key -> meta
    expenses:  { label: "Expenses", unit: "THB", kind: "money",  higherIsBetter: false },
    income:    { label: "Income",   unit: "THB", kind: "money",  higherIsBetter: true  },
    risks:     { label: "Risks",    unit: "lvl", kind: "score",  higherIsBetter: false },
    health:    { label: "Health",   unit: "pts", kind: "score",  higherIsBetter: true  },
    fuel:      { label: "Fuel",     unit: "L",   kind: "volume", higherIsBetter: false },
    transport: { label: "Transport",unit: "km",  kind: "distance",higherIsBetter: false }
    // "not limited to" → user can add custom fields at runtime; stored here too
  },
  entries: [               // append-only log
    { id, fieldKey, value:Number, note:String, ts:Number(ms) }
  ],
  tax: {
    acknowledged: false,   // whether the one-time note was accepted
    questionnaire: {       // self-reported answers (educational only)
      understandsFiling: null,
      filingFrequency: null,
      tracksDeductions: null,
      lastFiledYear: null,
      notes: ""
    }
  },
  settings: { demoLoaded: false }
}
```

- `window.LifeStatsStorage`: `init`, `addEntry`, `getEntries`, `getFields`, `addCustomField`, `reset`, `setTax`, `getTax`.
- Versioned + `migrate()` like `player-storage.helpers.js`. Wrap all `localStorage` access in try/catch (quota / private-mode safe).
- Validation: `value` is a finite number; `fieldKey` exists (or is a known custom field); `ts` defaults to `Date.now()`.

---

## 5. Aggregation engine (`life-stats-aggregate.js`)

Inputs: `entries`, `rangeKey`. Output: `{ buckets: [{label, startTs, totals:{fieldKey:value}, counts}], series: {fieldKey: number[]}, rollups }`.

**Fixed ranges** (the ten requested):
`1d, 1w, 1mo, 4mo, 6mo, 8mo, 12mo, 48mo, 96mo, 212mo`.

**Bucket granularity** chosen by range to keep charts readable:
- `1d`  → hourly buckets (24)
- `1w`  → daily buckets (7)
- `1mo` → daily buckets (~30)
- `4mo`,`6mo`,`8mo`,`12mo` → monthly buckets (4–12)
- `48mo`,`96mo` → quarterly buckets (16–32)
- `212mo` → yearly buckets (~17–18)

Each bucket sums the selected field(s). Unfilled buckets render as gaps (not zero-faked) so trends stay honest.

---

## 6. Menu feature graphs (`life-stats-menu.js`)

On `index.html`, a `#life-stats-features` panel shows, for the 3–4 most-logged fields, a **mini SVG sparkline** + a current-value / delta chip. This satisfies "various detailed graphs depicting various information as features for the menu." A "Life Stats" button opens the full board. Panel is hidden until storage has ≥1 entry (or demo loaded) to avoid an empty first-run UI; the button itself is always present.

---

## 7. Stats board page (`life-stats.html`)

Layout:
1. **Header**: title, "Add entry" button (opens logging form/modal), "Load demo data" button, export buttons (JSON / CSV / SVG / PNG), "Reset" (confirm).
2. **Range tabs**: the ten ranges as a scrollable tab strip; active range drives all charts.
3. **Stat cards row**: per visible field — latest value, avg over range, min/max, net change (with ▲/▼ and color by `higherIsBetter`).
4. **Graphs** (various, all SVG):
   - **Line chart**: per-field trend across buckets (multi-series, toggle fields via legend).
   - **Bar chart**: per-bucket totals (stacked option for composition).
   - **Donut chart**: composition of a chosen field's category split (e.g., Expenses by note/category tag) — uses `note` as category when present.
5. **Logging form** (modal): field select, value (number input), note (optional), date (defaults today). Validates, appends, re-renders.

All charts are keyboard-accessible: each has a `<title>`/`<desc>`, focusable group, and an `aria-label` summarizing the series. No flashing animations on data viz.

---

## 8. TAX feature (`life-stats-tax.js`)

Requirement: a red element in the **right corner** that is visible constantly; on click → one-time note "Do you understand tax?" with Yes/No; then educational description + questionnaire collecting the user's self-reported info to "help average users understand their tax responsibilities."

### Accessibility-compliant design (deviation from literal "flashes red constantly")
A constantly *flashing* element violates **WCAG 2.2 SC 2.3.1** (flashing ≤ 3 Hz to prevent photosensitive seizures) and is hostile UX. Instead:
- `#tax-indicator`: fixed, top-right corner, **steady solid red badge** (e.g., red dot + "TAX" label) with a **slow calm pulse** (≤ 1 Hz, opacity 1.0↔0.65) — attention-grabbing but safe. A `prefers-reduced-motion` media query disables the pulse entirely (steady red only). This preserves the intent (always-visible red attention signal) without the hazard.
- Persisted `tax.acknowledged`. If already acknowledged, badge becomes a muted/dim red (still present, quieter) so it's "constant" but not nagging.
- **On click** → modal dialog (`role="dialog" aria-modal="true"`):
  1. One-time note: "Do you understand tax?" with **Yes** / **No** buttons.
  2. After choice, show a plain-language description of common tax responsibilities (generic, educational, jurisdiction-agnostic where law differs) + a short **questionnaire** (self-reported):
     - "Do you currently file a tax return?" (Yes/No/Unsure)
     - "How often do you need to file?" (Annually / Quarterly / Not sure)
     - "Do you track deductible expenses?" (Yes/No)
     - "Last filing year" (text/number)
     - Free-text note.
  3. On submit → save `tax.questionnaire` + `tax.acknowledged=true`; badge dims. Data stays local only.

No legal advice is given; copy states it is educational and links users to their local tax authority in generic terms.

---

## 9. Export (`life-stats-export.js`)

- **JSON**: full storage object (entries, fields, tax, settings) → `Blob` → download `life-stats-<range>-<date>.json`.
- **CSV**: entries flattened (`ts,isoTs,fieldKey,fieldLabel,value,unit,note`) → download `.csv`. UTF-8 BOM for Excel safety.
- **SVG**: serialize the active chart's `<svg>` (clone, inline computed styles minimally) → download `.svg`.
- **PNG**: draw the SVG onto an offscreen `<canvas>` (`Image` + `canvas.toBlob`) → download `.png`. Handles the current active chart; "Export all" iterates each chart.
- All downloads use `URL.createObjectURL` + a temporary `<a download>`; revoked after. No network.

---

## 10. Demo seed (`life-stats-seed.js`)

`loadDemoData()` generates ~18 months of plausible daily entries across all default fields with mild trend + noise + occasional spikes, so:
- Short ranges (1d/1w/1mo) show recent detail.
- Long ranges (up to 212mo) show generated sparse historical points (e.g., monthly aggregates back-filled ~17 years) so every tab renders something.
- Sets `settings.demoLoaded=true`; re-running is idempotent (clears prior demo entries first).

---

## 11. Testing (Playwright, project standard)

`tests/life-stats.spec.js` (run via `npm run test`):
- Menu: "Life Stats" button navigates to board.
- Board: each of the ten range tabs renders charts (assert SVG node count > 0).
- Logging: add an entry → stat card updates.
- Demo: "Load demo data" → entries present, all ranges render.
- TAX: indicator present & red; click → modal; Yes → acknowledged persisted; badge dims on reload.
- Export: JSON download triggers (assert blob via Playwright download event); PNG export produces a file.
- Accessibility: `prefers-reduced-motion` disables pulse (assert no animation / steady style).

Verify also: `npm run lint`, `npm run typecheck`, `npm run verify`.

---

## 12. Best-practices checklist (applied throughout)
- Offline-only, no telemetry, no external requests.
- Strict CSP unchanged (same-origin scripts, no inline handlers).
- WCAG 2.2 AA: labels, `aria-live` for value updates, keyboard-operable modals/tabs, no hazardous flashing, reduced-motion support, sufficient color contrast for red text on dark bg.
- DRY: one chart-builder module reused by menu + board; one storage module.
- Frequent commits per task (TDD: write test, watch fail, implement, watch pass, commit).

---

## 13. Open questions resolved
- "flashes red constantly" → steady red + safe slow pulse (WCAG). Noted as deliberate, justified deviation.
- "not limited to" fields → custom-field support included.
- TAX is educational awareness, not tax filing/calc.
