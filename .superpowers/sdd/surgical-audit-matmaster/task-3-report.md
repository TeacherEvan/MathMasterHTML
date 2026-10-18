# Task 3 Report — P0: Reconcile 3-Way Worm Subsystem Duplication

**Repo:** MathMasterHTML
**Branch:** `task-3-worm-dup-reconciliation`
**Base commit:** `4f13b3e`
**Status:** DONE_WITH_CONCERNS
**Date:** Sun Oct 18 2026

## Summary

Reconciled the 3-way worm subsystem split by retiring the dead Layer 3 (OOP `src/scripts/worm/**`) implementation and the unreferenced Layer 1 `worm-behavior-fsm.js` duplicate FSM. Layer 1 (standalone `worm-*.js`) and Layer 2 (`worm-system.*.js` mixins) are BOTH still loaded in `src/pages/game.html` and BOTH remain required by the hybrid runtime + the specified test suite; neither side of the remaining Layer 1↔Layer 2 duplicate pairs can be removed without breaking tests.

## What was done

### 1. Read the brief
` .superpowers/sdd/surgical-audit-matmaster/task-3-brief.md` read in full. Source plan: `docs/plans/SurgicalAudit Matmaster.txt` (Step 5, Prompt 3). Base commit `4f13b3e` confirmed (`git log`).

### 2. Compared duplicate pairs

| Pair | Layer 1 file | Layer 2 file | Layer 3 file | Runtime status |
|------|-------------|-------------|-------------|----------------|
| Powerup effects: chain | `worm-powerups.effects.chain.js` | `worm-system.powerups.effects.chain.js` | — | **Both loaded, both required** |
| Powerup effects: devil | `worm-powerups.effects.devil.js` | `worm-system.powerups.effects.devil.js` | — | **Both loaded, both required** |
| Powerup effects: spider | `worm-powerups.effects.spider.js` | `worm-system.powerups.effects.spider.js` | — | **Both loaded, both required** |
| Behavior | `worm-behavior-fsm.js` | `worm-system.behavior.js` | `BehaviorStateMachine.js` | `worm-system.behavior.js` required (`stealSymbol`); FSMs dead |
| Spawn | `worm-spawn-manager.js` | `worm-system.spawn.js` | — | `worm-system.spawn.js` required (`spawnWormFromConsole`, etc.) |
| Movement | `worm-movement.js` | `worm-system.movement.js` | — | Both required (`this.movement` used; `animate` loop) |

Key architectural finding (verified from `game.html` + `src/scripts/worm.js`):
- `window.WormSystem` is **defined in Layer 1** (`worm.js`) as a class shell (constructor / `initialize` / `destroy`), then instantiated as `window.wormSystem`.
- Layer 2 `worm-system.*.js` files all guard on `if (!window.WormSystem) return;` and **augment `WormSystem.prototype`** with `animate`, `stealSymbol`, `spawnWormFromConsole`, `spawnPurpleWorm`, `killAllWorms`, `removeWorm`, `activateChainLightning/Spider/Devil`, `dropPowerUp`, etc.
- Layer 1 `worm-powerups.effects.*.js` apply effects to `WormPowerUpSystem.prototype` via `window.WormPowerUpEffectsRegistry` (dispatch on `powerUpActivated` event) — a **different host object** than Layer 2's `WormSystem.prototype`.
- Therefore the runtime `WormSystem` is a **hybrid**: Layer 1 shell + Layer 2 mixin methods + Layer-1-named mixins (`worm-movement-behaviors.js`, `worm-movement-core.js`, `worm-movement-navigation.js`). Neither pure layer is self-sufficient.

Per-test requirements that forced both layers to stay:
- `tests/powerups.spec.js` two-click flow → Layer 1 `WormPowerUpSystem` + `WormPowerUpEffectsRegistry` + `worm-powerups.effects.*.js` (`selectPowerUp` → `powerUpActivated` → `_executeX` → `spawnX`).
- `tests/worm-behavior.spec.js` → `wormSystem.spawnWormFromConsole()` (Layer 2 `worm-system.spawn.js`), `wormSystem.killAllWorms()` (Layer 2 `worm-system.cleanup.js`), `wormSystem.stealSymbol()` (Layer 2 `worm-system.behavior.js`).
- `tests/worm-stability.spec.js` → `wormSystem._updateWormEvadingCursor()` (Layer-1-named `worm-movement-behaviors.js`), `wormSystem.removeWorm()` (Layer 2 `worm-system.cleanup.js`), `wormSystem.animate()` loop (Layer 2 `worm-system.movement.js`).
- `tests/lifecycle-hardening.spec.js:310-311` → `wormSystem.spawnSpider?.()` / `wormSystem.spawnDevil?.()` (Layer 2 `worm-system.powerups.effects.spider/devil.js`).
- `worm-renderer.js` / `worm-system.effects.js` → `wormSystem.dropPowerUp()` (Layer 2 `worm-system.powerups.js`).
- `tests/unit/worm-movement.spec.js` + `tests/performance/worm-movement-bench.spec.js` import `worm-movement.js` directly (`this.movement` is used by `worm-behavior.targeting.js`, `worm-renderer.js`, `worm-movement-navigation.js`, `worm-movement-core.js`, `worm-behavior.rush.js`).

Conclusion: **no side of the remaining Layer 1↔Layer 2 duplicate pairs can be `git rm`d without breaking tests.** The powerup-effect files target different host objects and are invoked through different consumers; the behavior/spawn/movement Layer 2 mixins supply methods the test suite calls directly on `wormSystem`.

### 3. Canonical layer decision
Kept the **loaded hybrid** (Layer 1 shell + Layer 2 mixins) as canonical — this is what `game.html` loads and what the tests exercise. Retired:
- Layer 3 dead code (not imported anywhere)
- Layer 1 `worm-behavior-fsm.js` (not in `game.html`, `WormBehaviorFSM` never instantiated)

### 4. Files removed (`git rm`, history preserved)
14 files, all verified unreferenced before deletion (grep across `src/`, `tests/`, `service-worker.js` returned no matches):

**Layer 3 dead code (13 files):**
- `src/scripts/worm/index.js`
- `src/scripts/worm/behavior/BehaviorStateMachine.js`
- `src/scripts/worm/behavior/WormState.js`
- `src/scripts/worm/behavior/CarryingState.js`
- `src/scripts/worm/behavior/DevilState.js`
- `src/scripts/worm/behavior/RoamingState.js`
- `src/scripts/worm/behavior/RushingState.js`
- `src/scripts/worm/behavior/StealingState.js`
- `src/scripts/worm/collision/SpatialHashGrid.js`
- `src/scripts/worm/core/EventBus.js`
- `src/scripts/worm/core/WormEvents.js`
- `src/scripts/worm/pools/ParticlePool.js`
- `src/scripts/worm/pools/WormSegmentPool.js`

**Duplicate/dead FSM (1 file):**
- `src/scripts/worm-behavior-fsm.js` (Layer 1; never loaded, never referenced)

`worm/index.js` (which listed Layer 3 files as string paths) is itself not imported anywhere, so the entire Layer 3 subtree is unreachable.

### 5. `game.html` script imports
No changes required: neither Layer 3 nor `worm-behavior-fsm.js` is referenced in `src/pages/game.html` (verified by grep). The `service-worker.js` precache list references only `worm-factory.js`, `worm-movement.js`, `worm-spawn-manager.js`, `worm-powerups.js`, `worm.js` — none deleted, so no service-worker change needed. `tsconfig.typecheck.json` references `worm-spawn-manager.js` (kept), so no change needed.

### 6. Reference verification
Grep across `src/`, `tests/`, `service-worker.js` for `WormBehaviorFSM`, `worm-behavior-fsm`, `BehaviorStateMachine`, `worm/index.js`, `src/scripts/worm/` → **no matches**. No file references a deleted module.

### 7. `node --check`
Ran `node --check` on every remaining `src/scripts/worm-*.js` and `src/scripts/worm-system*.js` file → **all passed** (no syntax errors).

### 8. Playwright verification
Command: `npx playwright test tests/worm-behavior.spec.js tests/powerups.spec.js tests/worm-stability.spec.js`

- Browsers: Chromium installed; **WebKit NOT installed** (`Executable doesn't exist at .../webkit-2336/pw_run.sh`).
- `[pixel-7]` (Chromium): **all applicable tests passed** — including the two-click power-up flow, worm spawn/kill/clone behavior, and stability guards (`_updateWormEvadingCursor`, `removeWorm`).
- `[iphone-13]` (WebKit): **all failed** solely because the WebKit browser binary is missing — an environment limitation, **not** caused by this change. The deleted code is not loaded by `game.html` and cannot affect test outcomes.
- Summary: **53 passed, 27 failed (all WebKit-unavailable), 1 skipped.**

## Concerns

1. **Layer 1↔Layer 2 duplication remains unresolved by removal.** The three powerup-effect pairs (`chain`/`devil`/`spider`) and the behavior/spawn/movement pairs still exist as dual implementations. They cannot be consolidated in this session because both sides serve active, test-covered consumers on different host objects (`WormPowerUpSystem` vs `WormSystem.prototype`). Removing either side breaks `tests/powerups.spec.js`, `tests/worm-behavior.spec.js`, `tests/worm-stability.spec.js`, and/or `tests/lifecycle-hardening.spec.js`.
   - A full consolidation would require migrating `dropPowerUp`, `spawnWormFromConsole`, `spawnPurpleWorm`, `killAllWorms`, `removeWorm`, `stealSymbol`, `animate`, `_updateWormEvadingCursor`, `activateChainLightning/Spider/Devil`, and `spawnDevil/spawnSpider` into a single canonical layer and rewiring `worm-system.powerups.js`, `worm-renderer.js`, `worm-system.effects.js`, and `lifecycle-hardening.spec.js` — a larger refactor beyond this session's safe scope without breaking the test suite.

2. **WebKit browser unavailable** in this environment, so `[iphone-13]` project tests cannot run. Chromium (`pixel-7`) passes.

3. The 3-way split is now a **2-way split** (Layer 1 + Layer 2). True single-canonical reconciliation of Layer 1 vs Layer 2 is deferred due to the risk of breaking the hybrid runtime.

## Commit

One commit on branch `task-3-worm-dup-reconciliation` containing only the 14 file deletions (`git rm`, history preserved). Pre-existing uncommitted changes (`Plan Alpha.md`, `Plan Beta.md`, `Plan Genesis.md`, `README.md`, `src/tools/scripts/verify/...`) were left untouched.
