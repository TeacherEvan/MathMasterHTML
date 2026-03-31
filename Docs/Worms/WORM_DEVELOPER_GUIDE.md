# Worm System Developer Guide

This is the living reference for the current worm runtime.

## Runtime truth

- Active code lives under `src/scripts/`, not legacy `js/` paths.
- `worm.js` now acts as the constructor and configuration shell for `WormSystem`.
- Most behavior lives in split helpers such as `worm-system.events.js`, `worm-system.spawn.js`, `worm-system.behavior.js`, `worm-system.interactions.js`, `worm-system.effects.js`, and `worm-system.cleanup.js`.
- Reward handling is split out to `worm-system.rewards.muffin.js`.

## Key files

| File | Responsibility |
| --- | --- |
| `src/scripts/worm.js` | Constructor state, difficulty settings, caches, runtime constants |
| `src/scripts/worm-system.events.js` | Event listeners for line completion, symbol clicks, purple triggers, and cleanup |
| `src/scripts/worm-system.spawn.js` | Green, purple, panel-B, and console spawn wiring |
| `src/scripts/worm-system.behavior.js` | Steal logic and behavior helpers |
| `src/scripts/worm-system.movement.js` | RAF-driven movement loop |
| `src/scripts/worm-system.interactions.js` | Green tap kills, purple clone penalty, direct interaction rules |
| `src/scripts/worm-system.effects.js` | Explosions, particles, and `wormExploded` dispatch |
| `src/scripts/worm-system.cleanup.js` | Worm removal and cleanup orchestration |
| `src/scripts/worm-powerups*.js` | Power-up inventory, UI, effects, and placement helpers |
| `src/scripts/worm-system.rewards.muffin.js` | Muffin reward lifecycle and purple kill bonuses |

## Event map

The worm system listens to these gameplay events:

- `problemLineCompleted`
- `problemCompleted`
- `purpleWormTriggered`
- `symbolClicked`
- `symbolRevealed`
- `wormCursorUpdate`
- `wormCursorTap`

It also emits or relies on:

- `wormExploded`
- `powerUpActivated`
- `qualityTierChanged` (indirectly through performance and quality subsystems)

## Current spawn rules

### Green worms

`worm-system.events.js` increments `rowsCompleted` whenever a line is solved and computes panel-B spawn count as:

```text
spawnCount = wormsPerRow + max(0, rowsCompleted - 1)
```

`worm.js` currently sets `wormsPerRow = 1` for all three difficulties, so a typical three-step problem yields 1, then 2, then 3 green worms over the life of the problem.

### Difficulty settings

| Difficulty | Base worms/row | Speed | Console roam | Border roam |
| --- | --- | --- | --- | --- |
| Beginner | 1 | 1.0x | 8000ms | 5000ms |
| Warrior | 1 | 1.5x | 6000ms | 4000ms |
| Master | 1 | 2.0x | 4000ms | 3000ms |

Automation mode (`navigator.webdriver === true`) caps `maxWorms` at `8`.

## Interaction rules

### Green worms

- direct `pointerdown` kills immediately
- matching rain-symbol clicks also explode them if they are carrying that symbol

### Purple worms

- triggered after **3 consecutive wrong answers** in `game-symbol-handler.core.js`
- direct click does **not** kill them
- direct click triggers the clone penalty in `worm-system.interactions.js`
- the only valid kill path is clicking the matching rain symbol while the worm is carrying it

## Reward rules

`worm-system.rewards.muffin.js` adds a second-stage reward surface after `wormExploded`:

- every worm explosion spawns a muffin button
- each muffin click grants 1000 bonus points
- the muffin resolves after four clicks with a shoutout and mini-fireworks
- purple rain-kills also grant 50,000 bonus points and 2 extra power-ups
- idempotency is enforced with processed-worm tracking so duplicate rewards are not applied

## Editing rules

- preserve the event-driven flow; do not short-circuit it with direct cross-module calls
- keep helper responsibilities split by concern
- use `pointerdown` for fast moving and touch-first worm interactions
- if you change reward flow, verify both `wormExploded` consumers and score bonus handling
- if you change spawn counts or pacing, update docs and targeted tests together

## Debug helpers

Open the game in a browser and use DevTools:

```javascript
window.wormSystem.worms.length
window.wormSystem.killAllWorms()
document.dispatchEvent(
  new CustomEvent("purpleWormTriggered", {
    detail: { wrongAnswerCount: 3 },
  }),
)
```

Useful observations:

- `window.wormSystem.rowsCompleted`
- `window.wormSystem.maxWorms`
- `window.performanceMonitor.getSnapshot()`

## Related docs

- `../SystemDocs/ARCHITECTURE.md`
- `../SystemDocs/PERFORMANCE.md`
- `./WORM_TESTING_GUIDE.md`
- `../../.github/copilot-instructions.md`
