# Worm System Testing Guide

This guide covers the current manual and automated validation paths for the worm system.

## Authoritative Source Note

This guide is the authoritative developer-facing source for worm testing and validation expectations. Keep `.github/instructions/worm-runtime.instructions.md` and other `.github` instruction files as thin wrappers that link here instead of duplicating scenario detail.

## Baseline commands

```bash
npm run verify
npm run typecheck
```

Useful focused runs:

```bash
npx playwright test tests/worm-behavior.spec.js --project=chromium
npx playwright test tests/worm-rewards.spec.js tests/worm-rewards-idempotency.spec.js --project=chromium
npx playwright test tests/worm-stability.spec.js tests/worm-cursor-evasion.spec.js --project=chromium
npx playwright test tests/timer.spec.js tests/level-select-scoreboard.spec.js --project=chromium
npx playwright test tests/performance-bench.spec.js tests/perf-scenarios.spec.js --project=chromium --project=pixel-7
```

## Manual smoke flow

1. Start the app with `npm start`.
2. Open `http://localhost:8000/game.html?level=beginner`.
3. Press `P` to enable the performance overlay.
4. Solve a full problem while watching line-completion spawn scaling, worm interactions, and score updates.

## Current high-value scenarios

### 1. Green-worm tap kill

- solve a line to spawn a green worm in Panel B
- tap the worm directly
- expected: immediate explosion on `pointerdown`

### 2. Row-scaling spawn counts

- complete three successive lines in one problem
- expected: 1 green worm after line 1, 2 after line 2, 3 after line 3 (subject to current spawn conditions and cleanup timing)

### 3. Purple threshold

- make three consecutive incorrect symbol selections
- expected: `purpleWormTriggered` fires and a purple worm spawns

### 4. Purple direct-click penalty

- click the purple worm directly
- expected: the purple worm survives and clones

### 5. Purple valid kill path

- let the purple worm carry a symbol
- click the matching symbol in Panel C rain
- expected: purple worm explodes and the bonus reward path activates

### 6. Muffin reward flow

- explode a worm
- expected: a muffin reward appears
- click the muffin four times
- expected: 1000 bonus points per click, then a shoutout and mini-fireworks on the fourth click

### 7. Purple bonus payout

- kill a purple worm through the valid rain path
- expected: large score bonus, extra power-ups, and a muffin reward

### 8. Persistence check

- complete a problem
- expected: score is recorded through `PlayerStorage` and reflected in scoreboard flows

### 9. Automation cap sanity check

- run Playwright or another webdriver session
- expected: worm counts stay within the webdriver cap and the game remains stable

## Console helpers

```javascript
window.wormSystem.worms.length
window.wormSystem.killAllWorms()
document.dispatchEvent(
  new CustomEvent("purpleWormTriggered", {
    detail: { wrongAnswerCount: 3 },
  }),
)
```

For persistence spot checks:

```javascript
window.PlayerStorage?.getProfile?.()
```

## What to watch in the overlay

- FPS stays near target
- DOM queries/sec stay controlled
- worm counts return to zero after cleanup events
- no obvious frame spikes when multiple worms explode or rewards appear

## When a worm change should block merge

- direct green taps stop exploding on `pointerdown`
- purple worms die on direct click instead of cloning
- reward bonuses double-apply
- row scaling or webdriver caps drift unexpectedly
- targeted worm Playwright specs fail
