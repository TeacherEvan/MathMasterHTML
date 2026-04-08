# MathMasterHTML Evan Attraction Follow-up Plan

## Goal

Refit Evan into an attraction-based helper instead of a direct click bot, add a real Stop-only manual assist mode, make green worms die on hand pass-over while purple worms ignore the hand, remove Evan resource pickup, unfreeze preload presentation, and restore Panel C rain on mobile.

## Architecture

Keep the existing event-driven runtime.

- `src/scripts/evan-helper.presenter.js` owns visuals and input lock only.
- `src/scripts/game-onboarding.controller.js` owns manual and auto start-stop flow.
- `src/scripts/evan-helper.controller.js`, `src/scripts/evan-helper.controller.runtime.js`, and `src/scripts/evan-helper.controller.targets.js` become a tracker-transfer loop: the hand chases a valid symbol, but a separate timed transfer commits selection only after the symbol has remained visible in Panel C for 3000ms.
- Manual Solve exposes the red frame and hard-locks input except for the new Stop control.
- Mobile rain stays owned by `src/scripts/3rdDISPLAY.js` and `src/scripts/display-manager.mobile.js`.
- Preload stays owned by `src/scripts/startup-preload.js` plus `src/styles/css/game-modals.preload.css`.

## Risks

1. Mobile rain suppression in `src/scripts/3rdDISPLAY.js` may be caused by compact-mode gating rather than the spawn controller itself.
2. Input lock currently assumes Skip is the only allowed exit control.
3. The current Evan symbol loop emits selection immediately after movement, so delayed transfer needs cancellable target state.

## Milestones

1. Control shell and input-lock contract
2. Attraction-transfer symbol flow
3. Worm rules simplification
4. Preload/mobile stability and closeout

## Tasks

### Task 1: Baseline characterization [S]

Files:

- `tests/evan-helper.controls.spec.js`
- `tests/evan-helper.symbols.spec.js`
- `tests/evan-helper.worms.spec.js`
- `tests/startup-preload.spec.js`
- `tests/symbol-rain.mobile.spec.js`

Commands:

```sh
npm run typecheck
npx playwright test tests/evan-helper.controls.spec.js tests/evan-helper.symbols.spec.js tests/evan-helper.worms.spec.js tests/startup-preload.spec.js tests/symbol-rain.mobile.spec.js --reporter=line --workers=1
```

Expected output: capture the current baseline with no code changes.

### Task 2: Write failing control-shell tests [M]

Files:

- `tests/evan-helper.controls.spec.js`
- `tests/evan-helper.flow.spec.js`
- `tests/ui-boundary.spec.js`

Assertions:

- Solve lives under the lock in Panel A, not in Panel B.
- Manual Solve shows the red frame and a Stop button beside the audio control.
- While manual assist is active, only Stop remains interactive.
- Stop emits the existing stop event and restores normal input.

Command:

```sh
npx playwright test tests/evan-helper.controls.spec.js tests/evan-helper.flow.spec.js tests/ui-boundary.spec.js --reporter=line --workers=1
```

Expected output: fail on Solve location, missing Stop control, and lock behavior.

### Task 3: Implement control shell [M]

Files:

- `src/pages/game.html`
- `src/scripts/evan-helper.presenter.js`
- `src/scripts/game-onboarding.controller.js`
- `src/styles/css/game-modals.evan.css`

Work:

- Move Solve into Panel A under the lock.
- Add the Stop button near the audio toggle.
- Manual mode locks all input except Stop while showing the red frame and assist shell.
- Stop ends assist with reason `manual-stop`.

Command:

```sh
npx playwright test tests/evan-helper.controls.spec.js tests/evan-helper.flow.spec.js tests/ui-boundary.spec.js --reporter=line --workers=1
```

Expected output: pass the new manual-control contract.

### Task 4: Write failing attraction/transfer tests [M]

File:

- `tests/evan-helper.symbols.spec.js`

Assertions:

- The hand moves toward the needed falling symbol without immediately dispatching selection.
- If the same symbol remains visible in Panel C for 3000ms, the existing symbol-selection path fires and Panel B advances.
- If the target disappears before 3000ms, nothing is selected and the loop re-evaluates.
- Manual solve does not require the hand itself to perform the selection action.

Command:

```sh
npx playwright test tests/evan-helper.symbols.spec.js --reporter=line --workers=1
```

Expected output: fail because current code emits selection immediately.

### Task 5: Implement attraction-transfer loop [M]

Files:

- `src/scripts/evan-helper.controller.js`
- `src/scripts/evan-helper.controller.runtime.js`
- `src/scripts/evan-helper.controller.targets.js`

Work:

- Replace immediate symbol click with a tracked-target state machine.
- Acquire a live target from Panel C.
- Move the hand toward it.
- Start a cancellable 3000ms visibility timer.
- Re-check the same target is still connected, visible, and text-matched.
- Only then dispatch the existing symbol-selection event so Panel B reveals the same variable through normal gameplay.

Command:

```sh
npx playwright test tests/evan-helper.symbols.spec.js --reporter=line --workers=1
```

Expected output: pass delayed transfer and stale-target recovery.

### Task 6: Write failing worm-rule tests [S]

Files:

- `tests/evan-helper.worms.spec.js`
- `tests/evan-helper.worms.purple.spec.js`

Assertions:

- Green worms die when the hand overlaps their live segment.
- Purple worms are unaffected by hand overlap.
- Manual solve does not collect muffins or use power-ups anymore.

Command:

```sh
npx playwright test tests/evan-helper.worms.spec.js tests/evan-helper.worms.purple.spec.js --reporter=line --workers=1
```

Expected output: fail because current controller still taps worms and collects rewards.

### Task 7: Implement worm overlap and remove pickup logic [S]

Files:

- `src/scripts/evan-helper.controller.js`
- `src/scripts/evan-helper.controller.runtime.js`
- `src/scripts/evan-helper.controller.targets.js`

Work:

- Check the hand rectangle against visible green worm segments during motion.
- On overlap, emit the existing worm interaction path only for green worms.
- Exclude purple worms from overlap kills.
- Remove muffin and power-up branches from the active solve loop.

Command:

```sh
npx playwright test tests/evan-helper.worms.spec.js tests/evan-helper.worms.purple.spec.js --reporter=line --workers=1
```

Expected output: pass green overlap kills, purple ignore, and no resource collection.

### Task 8: Write failing preload/mobile regression tests [S]

Files:

- `tests/startup-preload.spec.js`
- `tests/symbol-rain.mobile.spec.js`

Assertions:

- The preload visibly progresses or pulses while blocking.
- Falling symbols actually spawn on mobile after gameplay start.

Command:

```sh
npx playwright test tests/startup-preload.spec.js tests/symbol-rain.mobile.spec.js --reporter=line --workers=1
```

Expected output: fail on frozen-looking preload behavior and mobile spawn regression.

### Task 9: Implement preload motion and mobile rain fix [M]

Files:

- `src/scripts/startup-preload.js`
- `src/styles/css/game-modals.preload.css`
- `src/scripts/3rdDISPLAY.js`
- `src/scripts/display-manager.mobile.js` if required by the failing test

Work:

- Make the preload show live progress changes or an indeterminate pulse instead of looking static.
- Ensure compact/mobile mode still boots the guaranteed symbol spawn controller and does not suppress Panel C rain after start.

Command:

```sh
npx playwright test tests/startup-preload.spec.js tests/symbol-rain.mobile.spec.js --reporter=line --workers=1
```

Expected output: pass visible preload activity and real mobile rain.

### Task 10: Final verification and doc touch-up [S]

Files:

- `Docs/SystemDocs/ARCHITECTURE.md` if the Evan contract summary needs an update

Commands:

```sh
npx playwright test tests/evan-helper.controls.spec.js tests/evan-helper.flow.spec.js tests/evan-helper.symbols.spec.js tests/evan-helper.worms.spec.js tests/evan-helper.worms.purple.spec.js tests/startup-preload.spec.js tests/symbol-rain.mobile.spec.js tests/ui-boundary.spec.js --reporter=line --workers=1
npm run typecheck
npm run verify
npm run test:competition:smoke
node src/tools/scripts/line-limit/cli.js
```

Expected output: all focused specs pass, typecheck and verify exit 0, smoke lane exits 0, and no line-limit violations.

## Dependency Flow

- Task 1 feeds Tasks 2 and 8.
- Task 3 gates Task 4.
- Task 5 gates Task 6.
- Task 7 gates Task 9.
- Task 10 waits for Tasks 3, 5, 7, and 9.

## Rollback Points

1. Revert `src/pages/game.html`, `src/scripts/evan-helper.presenter.js`, `src/scripts/game-onboarding.controller.js`, and `src/styles/css/game-modals.evan.css`.
2. Revert the Evan controller split files only.
3. Revert `src/scripts/startup-preload.js`, `src/styles/css/game-modals.preload.css`, `src/scripts/3rdDISPLAY.js`, and `src/scripts/display-manager.mobile.js`.