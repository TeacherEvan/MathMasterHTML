# Bug Fix + Feature Plan: Worm touch reliability, muffin reward chain, purple bonus

## Problem statement
- Android/mobile worm kills are unreliable because green worms currently require a second hit within `WORM_CLICK_GRACE_WINDOW` (`src/scripts/worm-system.interactions.js`), so one tap often only triggers escape behavior.
- Requested behavior changes:
  - Worms should die on a single click/touch.
  - Any killed worm should be replaced with a muffin collectible.
  - Muffin grants 1000 points per click and resolves after 4 clicks with a gold shoutout plus local transparent mini fireworks.
  - Purple worm kill should also spawn a muffin, and additionally grant 50,000 points + 2 power-ups immediately.

## Current-state findings that guide implementation
- Worm interactions are pointer-first and centralized in `worm-system.interactions.js` with spawn wiring in `worm-system.spawn.js`.
- Worm death pipeline is centralized through `explodeWorm()` in `worm-system.effects.js`, and emits `wormExploded` events.
- Score display logic is centralized in `ScoreTimerManager` (`score-timer-manager.js`, `score-timer.runtime.js`) with no direct “add arbitrary points” API yet.
- Power-up inventory and collection APIs are in `worm-system.powerups.js`.
- Existing popup/effect patterns can be reused from `utils-achievements.ui.js` and `game-effects.js`.

## Implementation approach
1. Fix root cause of mobile kill issue by changing green-worm click handling from double-hit grace-window logic to deterministic single-hit kill behavior.
2. Add a small event-driven reward system around worm deaths:
   - Dispatch a dedicated “worm eliminated” reward event with coordinates and worm metadata from the explosion path.
   - Handle reward event in a new muffin/reward module that spawns and manages muffin lifecycle.
3. Extend scoring with a safe additive method (for bonuses outside step locking) and route muffin/purple bonuses through it.
4. Implement lightweight visual feedback for shoutout + localized mini fireworks with reduced-motion-friendly behavior.
5. Add/adjust tests for mobile pointer kill behavior, muffin click progression, purple reward payout, and no regression to existing worm/power-up flow.

## Todo list
1. **Single-tap kill fix**
   - Update `src/scripts/worm-system.interactions.js`:
     - Remove/retire first-strike grace behavior for green worms.
     - Keep purple direct-click clone penalty behavior unchanged.
   - Ensure pointer event path remains `pointerdown`-driven (already wired in spawn helpers).

2. **Score bonus API**
   - Update `src/scripts/score-timer-manager.js`:
     - Add explicit public method for additive bonuses (e.g., `addBonusPoints(points, meta)`).
     - Keep existing timer/step-lock behavior intact.
     - Dispatch a bonus event for UI hooks.

3. **Muffin reward system**
   - Add new module: `src/scripts/worm-system.rewards.muffin.js` (or equivalent split-convention file):
     - Listen to worm-elimination event.
     - Spawn muffin at kill location.
     - Track per-muffin click count (target: 4).
     - On each click add 1000 points via score API.
     - On 4th click remove muffin and trigger shoutout + fireworks.

4. **Purple kill bonus integration**
   - In worm explosion/reward event flow (`src/scripts/worm-system.effects.js` and/or reward module):
     - On purple worm killed via valid rain-symbol path, immediately add +50,000 points.
     - Grant +2 power-ups (two inventory increments with existing type rules; deterministic/random policy to be finalized in implementation notes, defaulting to random non-null types via existing power-up type list).
     - Still spawn muffin (confirmed scope).

5. **Visual effects + styling**
   - Update styles in `src/styles/css/worm-effects.core.css` and/or `src/styles/css/game-effects.css`:
     - Muffin visual style and click feedback.
     - Gold shoutout style.
     - Small-radius transparent fireworks effect.
   - Keep performance-conscious animations and reduced-motion compatibility.

6. **Script wiring**
   - Update `src/pages/game.html` script includes to load new reward module in correct dependency order (before consumers that need it).

7. **Test coverage**
   - Update/add Playwright specs in `tests/` (likely `worm-behavior.spec.js`, `gameplay-features.spec.js`, `powerups.spec.js`):
     - Green worm one-tap kill on mobile-emulated projects.
     - Muffin 4-click progression and point accumulation.
     - Purple kill yields +50,000 and +2 power-ups plus muffin spawn.
     - Event flow remains stable and no duplicate rewards on chain events.

8. **Validation**
   - Run baseline validation:
     - `npm run verify`
     - `npm run typecheck`
     - targeted Playwright tests for touched behavior
   - Fix regressions and re-run until green.

## Notes / risk controls
- Preserve event-driven architecture: reward flow should communicate via DOM custom events, not direct cross-module calls.
- Ensure reward idempotency: each worm death should emit/process exactly once, even for chain reactions.
- Keep purple constraints intact: direct purple click remains clone penalty; rain-symbol kill remains valid kill path.
- Follow existing performance patterns (no per-frame DOM queries, small DOM footprint for fireworks, timely cleanup).
