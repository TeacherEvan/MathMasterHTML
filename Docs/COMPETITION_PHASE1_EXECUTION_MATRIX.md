# Competition Phase 1 Execution Matrix

**Project:** MathMasterHTML
**Date:** 2026-03-09
**Purpose:** Convert the approved Phase 1 roadmap into a file-targeted execution plan without changing gameplay behavior prematurely.

---

## 1) Scope

This matrix breaks the approved roadmap into concrete work packets with:

- target files/modules
- intended changes
- validation requirements
- risk level
- rollback notes

It is designed for a **documentation-first execution phase**.
Implementation should follow this matrix in order.

---

## 2) Decision Gate Summary

Before implementation starts, confirm these scope decisions:

| Decision                     |          Required? | Notes                                                             |
| ---------------------------- | -----------------: | ----------------------------------------------------------------- |
| Tooling truth pass first     |                Yes | Must precede QA and architecture work                             |
| Competition QA lane creation |                Yes | Required for safe iteration                                       |
| Online synchronized matches  | No (decision gate) | Proceed only if competition brief explicitly requires multiplayer |
| UX accessibility hardening   |                Yes | Required regardless of online scope                               |

---

## 3) Execution Matrix

| Phase | Workstream                                    | Target files/modules                                                                                                                                    | Intended change                                                                               | Validation                                                               | Risk      | Rollback                                                |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------- | ------------------------------------------------------- |
| 0A    | Tooling truth pass                            | `package.json`, workspace tasks, `JOBCARD.md`, `.github/copilot-instructions.md`, relevant docs                                                         | Align scripts, tasks, docs, and actual runtime/tooling expectations                           | `npm run verify`; docs review; command consistency audit                 | Low       | Revert doc/task cleanup only                            |
| 0B    | Event contract inventory                      | `src/scripts/game-*.js`, `src/scripts/worm-system.*.js`, `src/scripts/lock-manager*.js`, `src/scripts/console-manager*.js`, `src/scripts/3rdDISPLAY.js` | Document canonical events, payloads, producers, consumers                                     | Event inventory doc completed; no broken flows in manual smoke test      | Medium    | Docs-only rollback if inventory inaccurate              |
| 0C    | Observability foundation                      | `playwright.config.js`, `tests/global-setup.js`, new fixtures/helpers under `tests/`                                                                    | Add deterministic setup, logging hooks, runtime observers                                     | Focused Playwright smoke lane passes; artifacts generated                | Medium    | Disable new fixtures/reporters                          |
| 1A    | Startup determinism                           | `src/pages/game.html`, `src/scripts/game.js`, `src/scripts/game-init.js`, lazy loader scripts                                                           | Make initialization order explicit and fail-fast in debug/QA                                  | Manual load of all 3 levels; no silent partial boot                      | High      | Restore prior bootstrap flow                            |
| 1B    | Tooling cleanup                               | `package.json`, workspace tasks/config, docs                                                                                                            | Remove duplicate config drift; ensure repo tasks match Node/Playwright workflow               | `npm run verify`; test command audit                                     | Medium    | Restore previous configs if tooling unexpectedly breaks |
| 2A    | Boundary hardening                            | direct singleton touchpoints in `worm-system.*`, `lock-manager*`, `console-manager*`, `game-*`                                                          | Replace cross-domain direct state mutations with event/adapters                               | Existing gameplay tests + targeted manual event flow checks              | High      | Re-enable legacy direct path behind guarded fallback    |
| 2B    | Security/perf guardrails                      | event producers/consumers, spawn queue logic, loader modules, service worker                                                                            | Add event validation/rate limits, queue bounds, safer loader/cache handling                   | Regression smoke tests; no spawn flood/perf collapse in basic stress run | High      | Feature-flag or guard new checks                        |
| 3A    | Competition QA lane                           | new `playwright.competition.config.js`, `tests/fixtures/*`, `tests/helpers/*`                                                                           | Add smoke/matrix/soak profiles with deterministic seed/state reset                            | Smoke lane green; artifact outputs present                               | Medium    | Keep existing Playwright config as default              |
| 3B    | Accessibility + UX P0                         | level select/game UI, console interactions, display manager, timer/HUD docs/tests                                                                       | Keyboard equivalence, readability thresholds, focus safety                                    | Keyboard/manual tests; Playwright accessibility checks                   | Medium    | Roll back UI-only changes                               |
| 4A    | Loading-state resilience                      | problem loaders, lazy loaders, lock/component loading, service worker hooks                                                                             | Add `T_soft`/`T_hard` timeouts, visible fallback states, retry paths                          | Simulated slow/failure load scenarios pass                               | High      | Restore previous loading flow                           |
| 4B    | Net bridge skeleton (only if approved)        | new net adapter layer + event bridge docs/tests                                                                                                         | Introduce protocol envelope and bridge architecture without full gameplay authority migration | Contract tests; no regression in local mode                              | High      | Feature-flag off net bridge                             |
| 5A    | Reconnect/resync authority (only if approved) | future network modules + timer/score/progression ownership boundaries                                                                                   | Move online authority to server-compatible pathways                                           | Synthetic match tests; desync/reconnect scenarios                        | Very High | Keep local/offline mode authoritative                   |

---

## 4) Immediate File Priorities

These are the first files that should be touched once implementation begins:

1. `package.json`
2. workspace task configuration
3. `.github/copilot-instructions.md`
4. `JOBCARD.md`
5. `playwright.config.js`
6. `tests/global-setup.js`
7. `src/pages/game.html`
8. `src/scripts/game-init.js`
9. `src/scripts/game.js`
10. `src/scripts/worm-system.events.js`

This order minimizes risk by fixing project truth and testability before gameplay internals.

---

## 5) Validation Matrix

| Work type                     | Required validation                                                   |
| ----------------------------- | --------------------------------------------------------------------- |
| Documentation/tooling updates | `npm run verify` + command consistency review                         |
| Bootstrap changes             | Manual load test across `beginner`, `warrior`, `master`               |
| Event/boundary changes        | Event flow smoke test from symbol click through lock/worm progression |
| QA config changes             | Focused Playwright smoke run                                          |
| UX P0 changes                 | Keyboard-only interaction pass + mobile readability spot check        |
| Loading resilience            | Simulated slow/failing asset/component fetch behavior                 |
| Netcode work                  | Synthetic match contract tests before any gameplay migration          |

---

## 6) Risks to Watch Closely

- Script load order regressions from `game.html`
- Breaking event-driven conventions by introducing direct calls
- Compounding existing Playwright/ESM friction before config cleanup
- Regressing display sizing by editing CSS instead of `display-manager.js`
- Overbuilding multiplayer infrastructure before scope approval

---

## 7) Definition of Ready for Implementation

Implementation may begin when:

- roadmap is approved,
- execution matrix is approved,
- tooling truth pass is accepted as the first workstream,
- online scope decision is explicit.

---

## 8) Definition of Complete for This Document

This execution matrix is complete when every approved roadmap item has:

- a target area,
- a validation path,
- a risk classification,
- a rollback note.
