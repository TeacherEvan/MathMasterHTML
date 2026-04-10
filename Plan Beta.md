# Plan Beta

## Purpose

Plan Beta is the roadmap and execution source of truth. It absorbs the old competition roadmap, execution matrix, recent superpower plans, brainstorm artifacts, and context maps.

## Active Product Priorities

1. Android WebView remains the primary quality bar.
2. H2P is exactly one dedicated tutorial level.
3. Gameplay should remain a puzzle; in-app bypasses should not undercut an unresolved level.
4. Deterministic runtime behavior beats speculative architecture churn.
5. Generated algebra is a later spike, not part of the critical gameplay path.

## Decision Gates

| Decision | Required | Current stance |
| --- | --- | --- |
| Tooling truth pass first | Yes | Always |
| Competition QA lanes | Yes | Maintain and extend |
| Online synchronized matches | Optional | Only if explicitly required |
| UX accessibility hardening | Yes | Always |
| Generated algebra rollout | Optional | Defer until after stable WebView tutorial path |

## Current Execution Order

### Phase 0: Project Truth

- align scripts, tasks, tests, and docs with actual runtime behavior
- keep verification green while reducing documentation sprawl

### Phase 1: Runtime Determinism

- preserve stable load order
- keep event contracts explicit
- avoid hidden partial boot states

### Phase 2: Mobile and WebView Quality

- compact/mobile classification stays centralized
- tutorial and onboarding work must validate on WebView-like conditions

### Phase 3: UX and Accessibility

- keyboard equivalence
- focus safety
- readability under pressure
- visible fallback messaging for degraded states

### Phase 4: Optional Future Work

- online bridge and reconnect architecture only after scope approval
- generated algebra experiments only after profiling demonstrates a real need

## Execution Matrix

| Phase | Workstream | Target areas | Validation |
| --- | --- | --- | --- |
| 0A | Tooling truth pass | `package.json`, workspace tasks, docs, verify script | `npm run verify` |
| 0B | Event contract inventory | game, worm, lock, console, symbol-rain families | focused smoke and doc review |
| 0C | Observability foundation | Playwright config, fixtures, runtime observers | smoke lane with artifacts |
| 1A | Startup determinism | `src/pages/game.html`, game boot chain, lazy loaders | manual three-level load + Playwright |
| 1B | Tooling cleanup | scripts, tasks, doc references | `npm run verify`, `npm run typecheck` |
| 2A | Boundary hardening | cross-domain state touchpoints | focused gameplay regressions |
| 2B | Security and perf guardrails | loaders, queues, event gateways, worker behavior | stress and smoke lanes |
| 3A | Competition QA lane | competition config, helpers, deterministic state reset | smoke + matrix |
| 3B | Accessibility and UX P0 | level select, game UI, console, HUD | keyboard/manual + Playwright |
| 4A | Loading-state resilience | problem loaders, lazy loaders, worker hooks | slow/failing asset scenarios |
| 4B | Net bridge skeleton | future adapter layer only if approved | contract tests |
| 5A | Reconnect and authority | future network modules only if approved | synthetic match tests |

## Current Feature Track: Single H2P WebView Path

### Scope

- dedicated H2P route before Beginner
- forced Evan walkthrough on H2P
- in-app exit guard during unresolved gameplay
- WebView-first validation

### Acceptance Criteria

1. Beginner launches H2P only until tutorial completion.
2. H2P content is distinct from Beginner content.
3. Evan auto-runs on H2P even on compact/mobile surfaces.
4. Tutorial beat sequence demonstrates worm, muffin, power-up, and symbol solving.
5. In-app exits re-enable immediately on completion.

### Validation Batch

```bash
npx playwright test tests/tutorial-level-routing.spec.js tests/gameplay-exit-guard.spec.js tests/h2p-tutorial.spec.js --project=chromium --reporter=line
```

## Competition QA Policy

### Required Lanes

- PR smoke
- pre-merge matrix
- nightly soak and perf monitoring

### Determinism Rules

- inject deterministic seed when needed
- reset browser and app state between scenarios
- capture console errors, page errors, failed requests, and useful performance artifacts

### Merge Blocking Conditions

- unclassified runtime errors
- broken critical event sequence
- focused regression lane failure
- mobile/WebView contract failure on a touched surface

## Backlog Rules

### Do Now

- consolidate stale docs into the surviving five files
- keep verification aligned with repo reality
- protect WebView-first gameplay quality

### Do Next

- strengthen competition QA determinism
- keep startup/load resilience explicit
- improve accessibility and focus safety in high-pressure surfaces

### Defer

- online multiplayer architecture
- full generated algebra replacement
- broad rewrites that bypass existing event contracts

## Generated Algebra Decision

Generated algebra is not a performance optimization for this codebase right now.

Reasons:

- authored content is deterministic and simpler to validate
- Android WebView is the primary target and should avoid unnecessary symbolic runtime work
- the current bottlenecks are startup, layout, interaction, and regression safety, not authored problem-file overhead

If pursued later, it should be a separate spike with profiling, not a silent replacement of authored content.

## Rollback Philosophy

- isolate scope by workstream
- prefer reversible doc or config changes first
- do not mix architecture refactors with validation-lane changes unless necessary
- keep feature flags or guarded fallbacks for higher-risk runtime shifts

## Consolidation Record

Beta absorbed the old content from:

- `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`
- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`
- `.github/superpower/plan/*.md`
- `.github/superpower/brainstorm/*.md`
- `.github/superpower/context/*.md`

The deleted superpower artifacts were historical planning material, not durable source-of-truth docs.