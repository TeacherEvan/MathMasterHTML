# Task 3 Brief — P0: Reconcile 3-Way Worm Subsystem Duplication

**Source plan:** docs/plans/SurgicalAudit Matmaster.txt (Step 5, Prompt 3)
**BASE commit:** 4f13b3e

## Context / Where this fits
Phase 1, Task 3 of the surgical remediation plan. Addresses P0 finding #2: 3-way Worm subsystem split across 63+ files (76 actual: 49 worm-*.js + 14 worm-system.*.js + 13 src/scripts/worm/**). Three competing architectures coexist, and game.html loads BOTH Layer 1 (standalone) AND Layer 2 (mixins) at runtime, causing prototype mutation conflicts, shadowed methods, and duplicated logic that can drift out of sync.

## Key finding from game.html script imports (verified)
**ALL THREE layers exist in src/scripts/, but only TWO are loaded in game.html:**

| Layer | Files | Loaded in game.html? | Status |
|-------|-------|---------------------|--------|
| Layer 1: Standalone worm-*.js | 49 files | ✅ YES — lines 306-329, 335-342 | Active at runtime |
| Layer 2: System Mixins worm-system.*.js | 14 files | ✅ YES — lines 330-334, 338-347 | Active at runtime |
| Layer 3: OOP src/scripts/worm/** | 13 files | ❌ NO — not imported anywhere | Dead code |

Since Layer 1 and Layer 2 are BOTH loaded, and both define powerup effects, behavior, movement, spawn, etc., there are direct conflicts:
- `worm-powerups.effects.devil.js` vs `worm-system.powerups.effects.devil.js`
- `worm-powerups.effects.chain.js` vs `worm-system.powerups.effects.chain.js`
- `worm-powerups.effects.spider.js` vs `worm-system.powerups.effects.spider.js`
- `worm-behavior-fsm.js` vs `worm-system.behavior.js` vs `src/scripts/worm/behavior/BehaviorStateMachine.js`
- `worm-spawn-manager.js` vs `worm-system.spawn.js`
- `worm-movement.js` vs `worm-system.movement.js`

## Requirements (verbatim from Prompt 3)
1. Inspect src/pages/game.html to determine which of the three worm implementations are actively loaded at runtime (done above: Layers 1+2 active, Layer 3 dead).
2. Compare worm-powerups.effects.{chain,devil,spider}.js against worm-system.powerups.effects.{chain,devil,spider}.js.
3. Compare worm-behavior-fsm.js against src/scripts/worm/behavior/BehaviorStateMachine.js.
4. Consolidate duplicate logic into a single canonical implementation.
5. Remove shadowed duplicate files.
6. Verify `npx playwright test tests/worm-behavior.spec.js tests/powerups.spec.js tests/worm-stability.spec.js` passes (or note if browser unavailable).

## Known layer file inventories

Layer 1 (worm-*.js, all loaded):
- Core: worm.js, worm-constants.js, worm-factory.js, worm-renderer.js, worm-aggression.js, worm-cursor-tracker.js, worm-evasion.js, worm-near-miss-ui.js, worm-obstacle-map.js, worm-pathfinding.js
- Behavior: worm-behavior.js, worm-behavior-fsm.js, worm-behavior.rush.js, worm-behavior.steal.js, worm-behavior.targeting.js, worm-behavior.utils.js
- Movement: worm-movement.js, worm-movement-behaviors.js, worm-movement-core.js, worm-movement-navigation.js
- Powerups: worm-powerups.js, worm-powerups.core.js, worm-powerups.selection.js, worm-powerups.effects.js, worm-powerups.effects.chain.js, worm-powerups.effects.chain.targeting.js, worm-powerups.effects.chain.visuals.js, worm-powerups.effects.devil.js, worm-powerups.effects.spider.js, worm-powerups.ui.js, worm-powerups.ui.draggable.js, worm-powerups.ui.glitch.js
- Spawn: worm-spawn-manager.js, worm-spawn-manager.coordinator.core.js, worm-spawn-manager.coordinator.spawners.js, worm-spawn-manager.queue.js

Layer 2 (worm-system.*.js, all loaded):
- worm-system.behavior.js, worm-system.cache.js, worm-system.cleanup.js, worm-system.effects.js, worm-system.events.js, worm-system.gameover.js, worm-system.interactions.js, worm-system.movement.js, worm-system.powerups.js, worm-system.powerups.effects.chain.js, worm-system.powerups.effects.devil.js, worm-system.powerups.effects.spider.js, worm-system.rewards.muffin.js, worm-system.spawn.js

Layer 3 (src/scripts/worm/**, NOT loaded — dead code):
- worm/index.js, worm/behavior/{BehaviorStateMachine,WormState,CarryingState,DevilState,RoamingState,RushingState,StealingState}.js, worm/collision/SpatialHashGrid.js, worm/core/{EventBus,WormEvents}.js, worm/pools/{ParticlePool,WormSegmentPool}.js

## Report contract
Write full implementation report to `.superpowers/sdd/surgical-audit-matmaster/task-3-report.md`.
Return: status, commits, one-line test summary, concerns.

## Global constraints (binding)
- Do not break runtime behavior: Layers 1+2 are loaded in game.html; any removal must ensure remaining code provides equivalent functionality
- Prefer keeping Layer 1 (standalone worm-*.js) as canonical since it's the oldest and most referenced; retire Layer 2 duplicates and Layer 3 dead code — OR vice versa if Layer 2 is cleaner. The implementer decides based on code inspection.
- Every removed file must be verified as unreferenced (grep across src/, tests/, service-worker.js) before deletion
- `git rm` for removed files (preserve history)
- game.html script imports must be updated to reflect removals
- Tests must pass after changes (or document why they can't run)