# Math Master Algebra - AI Agent Instructions

This file is the repo-wide routing and guardrail layer.

## Repo-Wide Defaults

- Active runtime pages live in `src/pages/`; root HTML files stay redirect entrypoints.
- Preserve the browser-native script-tag runtime and event-driven boundaries.
- Panel A and Panel B sizing belongs to `src/scripts/display-manager.js`, not CSS overrides.
- Problem data is runtime content stored as JSON under `src/assets/problems/Assets/`.
- Default validation baseline is `npm run verify` and `npm run typecheck`.

## Markdown Policy

Only ten project Markdown files plus repo-local custom agent files in `.github/agents/*.agent.md` may exist in this repository:

1. `.github/copilot-instructions.md`
2. `JOBCARD.md`
3. `Plan Genesis.md`
4. `Plan Beta.md`
5. `Plan Alpha.md`
6. `README.md`

Do not add any other `.md` files outside `.github/agents/*.agent.md`. Consolidate new durable content into one of the three plan files based on scope:

- `Plan Genesis.md`: runtime architecture, workflow, testing, performance, and subsystem contracts.
- `Plan Beta.md`: roadmap, execution sequencing, validation lanes, backlog, and feature delivery policy.
- `Plan Alpha.md`: design system, UX intent, product rules, accessibility, and brand direction.

## Authoritative Docs

- `Plan Genesis.md` is the operational source of truth for runtime and engineering work.
- `Plan Beta.md` is the source of truth for roadmap and execution priorities.
- `Plan Alpha.md` is the source of truth for product, design, and experience rules.
- `JOBCARD.md` is the rolling work log.

## Scoped Guidance

### When editing compact Panel B console layout, Evan helper symbol collection, or install prompt touch flows

- Keep Panel B sizing ownership in `src/scripts/display-manager.js`, but fix compact answer/console overlap by adjusting console-owned CSS clearance rather than changing panel dimensions.
- Route Evan auto symbol collection through the same Symbol Rain helper path used by live Panel C interaction so DOM, active-rain state, and gameplay events stay in sync.
- Keep Evan hand movement clamped to the visible Panel C playfield when targeting live rain symbols near an edge.
- Treat the deferred install prompt as single-flight UI: repeated touch or click bursts must not re-enter `prompt()` while a native prompt cycle is already in progress.

### When editing `src/scripts/**/*.js` or `src/pages/**/*.html`

- Preserve script load order and `window.*` registration semantics.
- Keep cross-module integration event-driven.
- Prefer `Plan Genesis.md` first, then `Plan Alpha.md` for UX-sensitive behavior.

### When editing `tests/**/*.spec.js`

- Test the active runtime pages in `src/pages/` unless the redirect entrypoint itself is under test.
- Assert visible outcomes and shared event contracts rather than private implementation details.
- Use `Plan Genesis.md` for lane expectations and `Plan Beta.md` for execution priorities.
- For perf-sensitive Playwright lanes, keep first-run performance results authoritative; do not mask regressions with warmed same-page confirmation retries.

### When editing worm runtime or worm-related CSS

- Preserve split-by-concern worm files and reward behavior.
- Keep green worm, purple worm, muffin, and power-up rules aligned with `Plan Genesis.md`.

## Validation

- `npm run verify`
- `npm run typecheck`
- Run the smallest focused Playwright lane for the changed surface.
- For Symbol Rain flow regressions, run `npm run test:competition:soak:symbol-rain` for the dedicated 60-second Chromium, WebKit, and Firefox soak lane.
- When a local focused lane mixes `iphone-13` with `tests/perf-scenarios.spec.js`, keep that validation serialized/isolated rather than broadening repo-wide worker limits.

## Documentation Upkeep

- Fold duplicate or stale notes into the ten project Markdown files.
- Keep repo-local custom agent definitions in `.github/agents/*.agent.md` instead of adding new freeform docs.
- Prefer updating an existing plan section over creating a new heading dump.
- Keep every surviving Markdown file below 1000 lines.
