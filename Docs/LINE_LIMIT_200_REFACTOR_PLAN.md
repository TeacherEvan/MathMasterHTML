# 200-Line Maximum Refactor Plan

**Objective:** Enforce a strict **200-line maximum** for all **source** files in this repo, with explicit exclusions for **markdown**, **minified files**, **third-party libraries**, and **generated assets**.

This plan is designed for the MathMasterHTML architecture (static HTML + script tags + global `window.*` APIs), and emphasizes **incremental, low-risk change** with **backward compatibility**.

---

## Policy definition (what counts)

### Line limit

- A file is a **violation** if it has **more than 200 lines**.
- “Line” means a newline-delimited line in the stored file.

### Included file types (initial enforcement set)

The audit and the first enforcement pass focus on text source files that drive runtime behavior and tests:

- JavaScript / TypeScript: `.js`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.jsx`
- Markup and configuration-like sources: `.html`, `.json`, `.yml`, `.yaml`, `.xml`, `.svg`, `.txt`
- Styles: `.css`

> Note: As of the current audit, **only `.js` and `.html`** exceed 200 lines.

### Explicit exclusions (as requested)

**Excluded by type:**

- Markdown: `**/*.md`
- Minified + sourcemaps: `**/*.min.js`, `**/*.min.css`, `**/*.map`

**Excluded by location (third-party / generated):**

- `node_modules/`
- `.git/`
- `playwright-report/`
- `test-results/`
- `.snapshots/`
- `archive/`
- `.vscode/`

**Excluded by filename (generated assets):**

- `package-lock.json`
- `test-results.json`

If additional generated artifacts appear (coverage outputs, perf dumps, etc.), add them to the exclusion list.

---

## Current-state audit (baseline)

Audit artifacts are generated into `MathMasterHTML/Docs/`:

- `LINE_LIMIT_200_AUDIT.policy.summary.txt`
- `LINE_LIMIT_200_AUDIT.policy.all.csv`
- `LINE_LIMIT_200_AUDIT.policy.violations.csv`

### Summary (policy exclusions applied)

- **Included files:** 271
- **Violations (>200 lines):** **33**
  - By type: **27 JS**, **6 HTML**
  - By category:
    - `js-runtime`: 16
    - `tests`: 9
    - `assets-source`: 3
    - `pages`: 3
    - `tools`: 1
    - `misc`: 1

### Complete violation inventory (33 files)

Source of truth: `Docs/LINE_LIMIT_200_AUDIT.policy.violations.csv`.

| Category      | Lines | File                                                            | Primary refactor tactic                                                             |
| ------------- | ----: | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| tests         |   563 | `tests/integration/worm-movement-system.spec.js`                | Split spec into focused specs + move shared setup/assertions into test helpers      |
| tests         |   514 | `tests/integration/worm-movement-navigation.spec.js`            | Same as above                                                                       |
| tests         |   475 | `tests/integration/worm-movement-behaviors.spec.js`             | Same as above                                                                       |
| tests         |   425 | `tests/unit/worm-movement.spec.js`                              | Break into multiple unit specs + extract fixtures                                   |
| pages         |   393 | `src/pages/game.html`                                           | Move inline JS/CSS out; split markup into loadable fragments (client-side includes) |
| pages         |   350 | `src/pages/level-select.html`                                   | Same as above                                                                       |
| tests         |   333 | `tests/performance/worm-movement-bench.spec.js`                 | Split benches + extract harness                                                     |
| misc          |   325 | `service-worker.js`                                             | Split with `importScripts()` into caching/router modules                            |
| tests         |   299 | `tests/unit/worm-evasion.spec.js`                               | Split spec + helpers                                                                |
| assets-source |   298 | `src/assets/components/lock-components/line-6-transformer.html` | Move inline logic/styles out; convert repeated markup to fragments                  |
| js-runtime    |   290 | `src/scripts/worm.js`                                           | Convert to “hub” + delegate to submodules; keep `window.Worm*` API stable           |
| tests         |   289 | `tests/powerups.spec.js`                                        | Split + helpers                                                                     |
| js-runtime    |   257 | `src/scripts/worm-system.spawn.js`                              | Split queue/coordinator/timers vs DOM side effects                                  |
| tools         |   257 | `src/tools/scripts/verify.js`                                   | Split into verify modules; keep `verify.js` as orchestrator                         |
| js-runtime    |   256 | `src/scripts/ui-boundary-manager.core.js`                       | Split core responsibilities (registry vs overlap math vs logging)                   |
| tests         |   239 | `tests/utils/test-data-generators.js`                           | Split generators by domain; keep index re-export hub                                |
| js-runtime    |   238 | `src/scripts/worm-factory.js`                                   | Extract constructors/config/table-driven factory pieces                             |
| js-runtime    |   237 | `src/scripts/display-manager.js`                                | Extract DOM binding vs rendering vs state; keep stable API                          |
| js-runtime    |   232 | `src/scripts/worm-movement.js`                                  | Split path calc vs steering vs tick loop                                            |
| assets-source |   230 | `src/assets/components/lock-components/Line-5-transformer.html` | Same as lock-components above                                                       |
| js-runtime    |   226 | `src/scripts/symbol-validator.js`                               | Extract parsing/normalization helpers                                               |
| assets-source |   222 | `src/assets/components/lock-components/line-4-transformer.html` | Same as lock-components above                                                       |
| js-runtime    |   222 | `src/scripts/worm-system.effects.js`                            | Split per-effect modules; retain import hub                                         |
| pages         |   219 | `src/pages/index.html`                                          | Move inline logic/styles out; fragment large repeated markup                        |
| js-runtime    |   218 | `src/scripts/lock-responsive.js`                                | Split measurement vs layout application vs listeners                                |
| js-runtime    |   218 | `src/scripts/ui-boundary-manager.positioning.js`                | Split placement math vs DOM writes                                                  |
| js-runtime    |   218 | `src/scripts/worm-system.behavior.js`                           | Split behavior selection vs behavior execution                                      |
| js-runtime    |   215 | `src/scripts/worm-system.powerups.js`                           | Split inventory/state vs UI vs dispatch                                             |
| js-runtime    |   214 | `src/scripts/problem-loader.js`                                 | Split I/O (fetch/parse) vs caching vs adapters                                      |
| js-runtime    |   214 | `src/scripts/worm-renderer.js`                                  | Split DOM creation vs animation glue                                                |
| js-runtime    |   210 | `src/scripts/dynamic-quality-adjuster.js`                       | Split thresholds/config vs sampling vs applying changes                             |
| js-runtime    |   208 | `src/scripts/worm-movement-behaviors.js`                        | Split each behavior into its own file + registry hub                                |
| tests         |   207 | `tests/ui-boundary.spec.js`                                     | Split suites + helpers                                                              |

---

## Why this approach is “best practice aligned” (research synthesis)

This plan intentionally uses incremental, modular refactoring rather than big-bang rewrites.

Key takeaways applied here:

- **Small changes are safer and easier to review:** Google’s guidance emphasizes small, self-contained CLs to improve review quality, reduce bugs, and simplify rollback. This maps directly to doing the 200-line compliance work in **phased slices** rather than one repo-wide mega-change.

  - Source: Google Eng Practices — [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)

- **Refactors should preserve behavior and be explainable:** Google recommends clear change descriptions and separating refactoring from behavior change when possible.

  - Sources: [Writing good CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) and [Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)

- **Modularity via separation of concerns + SRP reduces coupling and improves maintainability:** Microsoft’s architectural principles highlight Separation of Concerns and Single Responsibility as drivers of modular, evolvable systems.

  - Source: Microsoft .NET Architecture — [Architectural principles](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles)

- **Incremental replacement + compatibility facades reduce migration risk:** The Strangler Fig pattern advocates adding an indirection/facade layer and gradually moving behavior while keeping the user-facing interface stable.

  - Sources: Microsoft pattern [Strangler Fig](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig) and Martin Fowler’s [Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html)

- **Transitional architecture is normal and valuable:** Temporary “scaffolding” code is often worth it because it reduces risk and improves time-to-value, as long as it’s removed when no longer needed.

  - Source: [Transitional Architecture](https://martinfowler.com/articles/patterns-legacy-displacement/transitional-architecture.html)

- **Make technical debt visible and pay it down intentionally:** The C2 technical debt writeup stresses visibility, explicit debt lists, and scheduling debt paydown so it doesn’t silently accumulate.
  - Source: [Technical Debt (C2 Wiki)](https://wiki.c2.com/?TechnicalDebt)

---

## Phased implementation plan (200-line compliance)

### Phase 0 — Lock the policy + make the debt visible (1–2 short PRs)

**Deliverables:**

1. Commit the audit artifacts listed above (CSV + summary).
2. Add/update documentation:
   - This plan (`Docs/LINE_LIMIT_200_REFACTOR_PLAN.md`)
   - A short “policy” doc (optional) with exclusions and rationale.
3. Establish a “violation burndown” target: 33 → 0.

**Risk:** Low.

### Phase 1 — Add enforcement tooling (warn-only → fail) (2–4 PRs)

Goal: prevent regressions while refactoring proceeds.

**Recommended enforcement stack:**

1. **Repo-wide line-limit checker** (Node script) that:
   - Applies the same inclusion/exclusion rules as the audit.
   - Fails CI when new violations are introduced.
   - Can run in two modes:
     - `--baseline` (warn-only; allows existing violations)
     - `--strict` (fail on any violation)
2. **ESLint `max-lines`** for JS/TS to catch issues earlier (fast feedback).
3. Integrate into `npm run verify` (already used as the standard project gate).
4. Optional: pre-commit hook (only if the repo is comfortable adding dev tooling).

**Migration path:**

- Week 1: gate in **baseline mode** (only fails if a change _adds_ violations).
- After Phase 4+: switch to **strict mode** (fails if any violations remain).

**Risk:** Low-medium (misconfigured exclusions can be noisy). Mitigation: keep the policy file as the source of truth.

### Phase 2 — Refactor “tools” + “tests” first (low runtime risk) (multiple PRs)

**Why:**

- Tests are large but refactoring them is low risk to gameplay.
- Shrinking tests improves clarity and makes later runtime refactors safer.

**Targets:**

- `src/tools/scripts/verify.js` → split into `verify.*.js` modules; keep `verify.js` as an orchestrator under 200.
- Split each oversized spec into multiple specs by scenario, extracting:
  - shared setup
  - fixtures
  - repeated assertion helpers
- `tests/utils/test-data-generators.js` → split by domain.

**Risk:** Low.

### Phase 3 — Refactor leaf-ish runtime modules (>200 but not the center of everything) (multiple PRs)

Focus on modules that can be split with minimal dependency shock:

- `dynamic-quality-adjuster.js`
- `symbol-validator.js`
- `problem-loader.js`
- `worm-factory.js`

**Technique:**

- Use “import hub” files:
  - Keep the old filename as the **stable entrypoint**.
  - Move logic into new small modules (`*.core.js`, `*.helpers.js`, `*.io.js`, etc.).
  - Entry hub composes them and exposes the same `window.*` APIs.

**Risk:** Medium (global API expectations). Mitigation: shims + smoke tests.

### Phase 4 — Refactor core runtime clusters (worm + boundary + effects) (multiple PRs)

**Targets:**

- `worm.js` (hub) + move remaining responsibilities into:
  - `worm.lifecycle.js`
  - `worm.events.js`
  - `worm.state.js`
  - (keep renderer/movement already split; further split if still >200)
- `worm-system.*` modules over 200: split by responsibility (spawn queue vs routing vs DOM side effects).
- UI boundary modules over 200: split “math/geometry” from “DOM writes/listeners”.

**Risk:** Medium-high.

**Mitigations:**

- Maintain stable event names and global symbols.
- Prefer refactor-only PRs (no behavior change) until sizes are under 200.
- Add Playwright smoke coverage for:
  - page load
  - starting a game
  - a worm spawn event
  - a powerup activation

### Phase 5 — Service worker modularization (1–3 PRs)

`service-worker.js` is a single file today.

**Strategy:**

- Convert `service-worker.js` into a <200-line “bootstrap” that calls `importScripts()`.
- Create small modules:
  - `sw.precache.js`
  - `sw.runtime-cache.js`
  - `sw.messages.js`
  - `sw.utils.js`

**Risk:** High (offline caching regressions).

**Mitigations:**

- Add a Playwright test that registers SW and verifies a cached asset load.
- Keep cache names stable.

### Phase 6 — HTML compliance (pages + lock-components) (multiple PRs)

HTML is the most challenging part of a strict 200-line policy in a static site.

**Guiding principle:** keep **top-level pages** as thin skeletons and move bulk content into **fragments**.

**Approach (client-side includes):**

1. Add a tiny fragment loader (e.g., `src/scripts/html-fragments.js`) that:
   - Finds nodes like `<div data-include="/src/assets/fragments/game/ui.html"></div>`
   - Fetches the fragment and injects it.
   - Plays nicely with the service worker for caching.
2. Convert:
   - `src/pages/game.html`
   - `src/pages/level-select.html`
   - `src/pages/index.html`
     into skeletons under 200 lines.
3. Split lock component HTML similarly by extracting repeated sections and moving inline JS/CSS out.

**Risk:** High (render timing, script order, and perceived load performance).

**Mitigations:**

- Precache fragments in the service worker.
- Ensure critical UI remains visible while fragments load (skeleton states).
- Add Playwright coverage for fragment injection and key UI presence.

---

## Prioritization strategy (what to do first)

Use a “blast radius first” ordering:

1. **Tools + tests** (safe, builds confidence)
2. **Leaf runtime modules** (fewer dependents)
3. **Core runtime clusters** (worm system, boundary manager)
4. **Service worker** (high risk)
5. **HTML pages + lock components** (highest structural risk)

Within a group, prioritize by:

- Highest line count first (fastest violation reduction)
- Lowest dependency fan-out first (reduces cascading changes)
- Files touched frequently (reduces future merge conflicts)

---

## Risk assessment (breaking changes & mitigations)

| Risk                                        | Where                        | Impact                          | Mitigation                                                              |
| ------------------------------------------- | ---------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| Script load order regression                | `src/pages/game.html` + hubs | runtime errors, missing globals | keep hub filenames stable; explicit load order; add smoke tests         |
| Global API drift                            | `window.*` modules           | subtle gameplay breakage        | compatibility shims + deprecation wrappers                              |
| CSS cascade changes when splitting          | styles/modules               | UI regressions                  | keep import hubs; prefer additive changes; visual smoke checks          |
| Service worker caching regressions          | `service-worker.js`          | offline/updates break           | `importScripts` bootstrap; stable cache names; SW-focused test          |
| Fragment loader timing issues               | HTML fragments               | content flashes, missing nodes  | skeleton UI, pre-cache fragments, ensure scripts wait for DOM nodes     |
| Test refactor reduces coverage accidentally | tests                        | hidden regressions              | enforce no net loss of assertions; run Playwright suite on refactor PRs |

---

## Definition of done

- `Docs/LINE_LIMIT_200_AUDIT.policy.violations.csv` is empty (0 rows after header).
- CI/verify fails on any newly introduced violation.
- `npm run verify` passes.
- `npx playwright test` passes (or at least the repo’s standard test gate).
