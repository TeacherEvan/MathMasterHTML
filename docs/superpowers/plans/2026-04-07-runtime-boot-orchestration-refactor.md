# Runtime Boot Orchestration Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented preload, briefing, timer, install prompt, and Evan input-lock handoff with one runtime coordinator so gameplay becomes interactive exactly once and every consumer reacts to the same readiness contract.

**Architecture:** Add a small browser-global coordinator that owns runtime state transitions for preload completion, briefing dismissal, gameplay readiness, and temporary input locks. Migrate existing modules to publish into that coordinator and subscribe to its derived events instead of inferring readiness independently from DOM state, modal visibility, or local booleans.

**Tech Stack:** Browser-native HTML/CSS/JavaScript, `window.*` globals, DOM `CustomEvent` contracts, Playwright end-to-end tests, existing `GameEvents` constants.

---

## File Structure

- Create: `src/scripts/game-runtime-coordinator.js`
  Responsibility: single source of truth for `preloadComplete`, `briefingDismissed`, `gameplayReady`, `inputLocked`, and lock ownership.
- Modify: `src/scripts/constants.events.js`
  Responsibility: define coordinator events so downstream modules stop inventing local readiness signals.
- Modify: `src/pages/game.html`
  Responsibility: load the coordinator before runtime consumers that depend on it.
- Modify: `src/scripts/startup-preload.js`
  Responsibility: publish preload completion into the coordinator instead of only firing overlay-local completion logic.
- Modify: `src/scripts/game-page.js`
  Responsibility: mark briefing dismissal through the coordinator and stop manually calling timer/onboarding fallbacks.
- Modify: `src/scripts/game-onboarding.controller.js`
  Responsibility: start auto Evan only after coordinator-confirmed gameplay readiness and stop treating `BRIEFING_DISMISSED` as sufficient.
- Modify: `src/scripts/evan-helper.presenter.js`
  Responsibility: route auto-help input locking through the coordinator instead of body-class state alone.
- Modify: `src/scripts/score-timer-manager.js`
  Responsibility: begin countdown only after coordinator-confirmed gameplay readiness and current-problem start.
- Modify: `src/scripts/game-init.js`
  Responsibility: subscribe to the coordinator event instead of duplicating briefing-to-timer startup behavior.
- Modify: `src/scripts/install-prompt.js`
  Responsibility: wait on coordinator-confirmed gameplay readiness instead of keeping separate `preloadComplete` and `briefingDismissed` booleans.
- Modify: `tests/utils/onboarding-runtime.js`
  Responsibility: wait for the coordinator to exist and expose helper polling for gameplay readiness.
- Create: `tests/runtime-boot-orchestration.spec.js`
  Responsibility: codify the coordinator contract and the shared boot transition that current failures are leaking across suites.
- Modify: `tests/e2e-full-game-critical.spec.js`
  Responsibility: wait for coordinator-confirmed gameplay readiness before interacting with gameplay systems.
- Modify: `tests/e2e-full-game-stress.spec.js`
  Responsibility: wait for coordinator-confirmed gameplay readiness before stress input begins.
- Modify: `tests/install-prompt.spec.js`
  Responsibility: assert the install prompt appears only after coordinator-confirmed gameplay readiness.
- Modify: `tests/timer.spec.js`
  Responsibility: assert countdown starts only after coordinator-confirmed gameplay readiness.

## Out Of Scope

- `tests/level-select-scoreboard.spec.js` is not part of the shared gameplay boot root cause. Validate it after the gameplay refactor, but do not mix level-select storage work into the first pass.

### Task 1: Introduce The Runtime Coordinator Contract

**Files:**
- Create: `src/scripts/game-runtime-coordinator.js`
- Modify: `src/scripts/constants.events.js`
- Modify: `src/pages/game.html`
- Create: `tests/runtime-boot-orchestration.spec.js`
- Modify: `tests/utils/onboarding-runtime.js`

- [ ] **Step 1: Write the failing coordinator contract test**

```javascript
import { expect, test } from "@playwright/test";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

test.describe("Runtime boot orchestration", () => {
  test("coordinator stays blocked until preload and briefing are both complete", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner");

    const initialState = await page.evaluate(() =>
      window.GameRuntimeCoordinator?.getState?.(),
    );

    expect(initialState).toEqual(
      expect.objectContaining({
        preloadComplete: false,
        briefingDismissed: false,
        gameplayReady: false,
        inputLocked: false,
      }),
    );

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason: "test" },
        }),
      );
    });

    const afterPreloadOnly = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(afterPreloadOnly.gameplayReady).toBe(false);

    await page.click("#start-game-btn");
    await page.waitForFunction(
      () => window.GameRuntimeCoordinator.getState().gameplayReady === true,
    );

    const finalState = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(finalState).toEqual(
      expect.objectContaining({
        preloadComplete: true,
        briefingDismissed: true,
        gameplayReady: true,
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/runtime-boot-orchestration.spec.js --reporter=line`
Expected: FAIL because `window.GameRuntimeCoordinator` does not exist yet.

- [ ] **Step 3: Write the minimal coordinator implementation and load it early**

```javascript
// src/scripts/game-runtime-coordinator.js
(function () {
  const GE = window.GameEvents;

  const state = {
    preloadComplete: false,
    preloadReason: null,
    briefingDismissed: false,
    gameplayReady: false,
    inputLocks: {},
    inputLocked: false,
  };

  function cloneState() {
    return {
      preloadComplete: state.preloadComplete,
      preloadReason: state.preloadReason,
      briefingDismissed: state.briefingDismissed,
      gameplayReady: state.gameplayReady,
      inputLocks: { ...state.inputLocks },
      inputLocked: state.inputLocked,
    };
  }

  function dispatch(name, detail) {
    if (!name) return;
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function recompute() {
    const nextInputLocked = Object.values(state.inputLocks).some(Boolean);
    const nextGameplayReady = state.preloadComplete && state.briefingDismissed;

    const inputChanged = nextInputLocked !== state.inputLocked;
    const readyChanged = nextGameplayReady !== state.gameplayReady;

    state.inputLocked = nextInputLocked;
    state.gameplayReady = nextGameplayReady;

    if (readyChanged) {
      dispatch(GE.GAMEPLAY_READY_CHANGED, cloneState());
    }
    if (inputChanged) {
      dispatch(GE.GAMEPLAY_INPUT_LOCK_CHANGED, cloneState());
    }
  }

  window.GameRuntimeCoordinator = {
    getState: cloneState,
    isGameplayReady: () => state.gameplayReady,
    canAcceptGameplayInput: () => state.gameplayReady && !state.inputLocked,
    markPreloadComplete(reason = "complete") {
      if (state.preloadComplete) return cloneState();
      state.preloadComplete = true;
      state.preloadReason = reason;
      recompute();
      return cloneState();
    },
    markBriefingDismissed() {
      if (state.briefingDismissed) return cloneState();
      state.briefingDismissed = true;
      recompute();
      return cloneState();
    },
    setInputLock(source, locked) {
      state.inputLocks[source] = Boolean(locked);
      recompute();
      return cloneState();
    },
  };
})();
```

```javascript
// src/scripts/constants.events.js
(function () {
  window.GameEvents = Object.freeze({
    // existing events...
    GAMEPLAY_READY_CHANGED: "gameplayReadyChanged",
    GAMEPLAY_INPUT_LOCK_CHANGED: "gameplayInputLockChanged",
  });
})();
```

```html
<!-- src/pages/game.html -->
<script src="/src/scripts/constants.js"></script>
<script src="/src/scripts/constants.events.js"></script>
<script src="/src/scripts/game-runtime-coordinator.js"></script>
```

```javascript
// tests/utils/onboarding-runtime.js
export async function waitForOnboardingRuntime(page) {
  await page.waitForFunction(
    () => {
      return Boolean(
        window.GameEvents &&
          window.GameOnboarding &&
          window.GameOnboardingStorage &&
          window.StartupPreload &&
          window.GameRuntimeCoordinator,
      );
    },
    { timeout: 10000 },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/runtime-boot-orchestration.spec.js --reporter=line`
Expected: PASS for the single coordinator contract test.

- [ ] **Step 5: Commit**

```bash
git add tests/runtime-boot-orchestration.spec.js tests/utils/onboarding-runtime.js src/scripts/constants.events.js src/scripts/game-runtime-coordinator.js src/pages/game.html
git commit -m "refactor: add runtime boot coordinator contract"
```

### Task 2: Route Preload And Briefing Through The Coordinator

**Files:**
- Modify: `src/scripts/startup-preload.js`
- Modify: `src/scripts/game-page.js`
- Modify: `src/scripts/game-onboarding.controller.js`
- Modify: `tests/runtime-boot-orchestration.spec.js`
- Modify: `tests/onboarding-gates.spec.js`

- [ ] **Step 1: Extend tests to lock the new shared transition**

```javascript
test("gameplayReadyChanged fires exactly once for the startup handoff", async ({
  page,
}) => {
  await gotoGameRuntime(page, "?level=beginner");

  await page.evaluate(() => {
    window.__readyEvents = [];
    document.addEventListener(window.GameEvents.GAMEPLAY_READY_CHANGED, (event) => {
      window.__readyEvents.push(event.detail);
    });
  });

  await page.evaluate(() => {
    document.dispatchEvent(
      new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
        detail: { reason: "test" },
      }),
    );
  });

  await page.click("#start-game-btn");
  await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

  const readyEvents = await page.evaluate(() => window.__readyEvents);
  expect(readyEvents).toHaveLength(1);
  expect(readyEvents[0]).toEqual(
    expect.objectContaining({
      gameplayReady: true,
      preloadComplete: true,
      briefingDismissed: true,
    }),
  );
});
```

```javascript
// tests/onboarding-gates.spec.js
test("session counter increments on each page load", async ({ page }) => {
  await resetOnboardingState(page, "?level=beginner&preload=off");
  await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

  const count1 = await page.evaluate(
    () => window.GameOnboardingStorage.getState().sessionCount,
  );

  await gotoGameRuntime(page, "?level=beginner&preload=off");
  await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

  const count2 = await page.evaluate(
    () => window.GameOnboardingStorage.getState().sessionCount,
  );
  expect(count2).toBe(count1 + 1);
});
```

- [ ] **Step 2: Run tests to verify they fail on duplicate or missing transitions**

Run: `npx playwright test tests/runtime-boot-orchestration.spec.js tests/onboarding-gates.spec.js --reporter=line`
Expected: FAIL because the coordinator exists but no module is publishing preload/briefing into it yet.

- [ ] **Step 3: Rewire startup-preload, game-page, and onboarding controller**

```javascript
// src/scripts/startup-preload.js
function dispatchComplete(reason) {
  window.GameRuntimeCoordinator?.markPreloadComplete?.(reason);

  if (!GE?.STARTUP_PRELOAD_COMPLETE) return;

  document.dispatchEvent(
    new CustomEvent(GE.STARTUP_PRELOAD_COMPLETE, {
      detail: { reason },
    }),
  );
}
```

```javascript
// src/scripts/game-page.js
function notifyBriefingDismissed() {
  window.GameRuntimeCoordinator?.markBriefingDismissed?.();

  if (GE?.BRIEFING_DISMISSED) {
    document.dispatchEvent(new CustomEvent(GE.BRIEFING_DISMISSED));
  }
}
```

```javascript
// src/scripts/game-onboarding.controller.js
document.addEventListener(GE.GAMEPLAY_READY_CHANGED, (event) => {
  if (!event.detail?.gameplayReady) return;
  onBriefingDismissed();
});

window.GameOnboardingController = {
  onBriefingDismissed: () => {
    window.GameRuntimeCoordinator?.markBriefingDismissed?.();
    document.dispatchEvent(new CustomEvent(GE.BRIEFING_DISMISSED));
  },
};
```

- [ ] **Step 4: Run tests to verify the shared transition passes**

Run: `npx playwright test tests/runtime-boot-orchestration.spec.js tests/onboarding-gates.spec.js --reporter=line`
Expected: PASS with a single `gameplayReadyChanged` emission and stable onboarding session increments.

- [ ] **Step 5: Commit**

```bash
git add tests/runtime-boot-orchestration.spec.js tests/onboarding-gates.spec.js src/scripts/startup-preload.js src/scripts/game-page.js src/scripts/game-onboarding.controller.js
git commit -m "refactor: route preload and briefing through coordinator"
```

### Task 3: Migrate Timer, Install Prompt, And Evan Input Lock To The Shared State

**Files:**
- Modify: `src/scripts/install-prompt.js`
- Modify: `src/scripts/score-timer-manager.js`
- Modify: `src/scripts/game-init.js`
- Modify: `src/scripts/evan-helper.presenter.js`
- Modify: `tests/runtime-boot-orchestration.spec.js`
- Modify: `tests/install-prompt.spec.js`
- Modify: `tests/timer.spec.js`

- [ ] **Step 1: Add failing regression tests for readiness-gated consumers**

```javascript
// tests/runtime-boot-orchestration.spec.js
test("auto Evan input lock is separate from gameplay readiness", async ({ page }) => {
  await gotoGameRuntime(page, "?level=beginner&evan=force&preload=off");
  await page.click("#start-game-btn");
  await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

  await page.evaluate(() => {
    document.dispatchEvent(
      new CustomEvent(window.GameEvents.EVAN_HELP_STARTED, {
        detail: { mode: "auto", level: "beginner" },
      }),
    );
  });

  await page.waitForFunction(
    () => window.GameRuntimeCoordinator.getState().inputLocked === true,
  );

  const lockedState = await page.evaluate(() =>
    window.GameRuntimeCoordinator.getState(),
  );
  expect(lockedState.gameplayReady).toBe(true);
  expect(lockedState.inputLocked).toBe(true);
});
```

```javascript
// tests/install-prompt.spec.js
test("install toast appears only after gameplayReady becomes true", async ({ page }) => {
  await seedOnboardingState(page, thresholdState(), "?level=beginner&preload=off");
  await simulateBeforeInstallPrompt(page);

  await expect(page.locator(".toast")).toHaveCount(0);

  await dismissBriefing(page);
  await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());
  await expect(page.locator(".toast")).toContainText(
    "Install Math Master for offline play",
  );
});
```

```javascript
// tests/timer.spec.js
test("timer starts after gameplayReady", async ({ page }) => {
  await page.goto("/game.html?level=beginner");
  await expect(page.locator("#timer-value")).toBeVisible({ timeout: 10000 });

  const beforeStart = parseInt((await page.locator("#timer-value").textContent()) || "0", 10);
  await page.waitForTimeout(1000);
  const stillBlocked = parseInt((await page.locator("#timer-value").textContent()) || "0", 10);
  expect(stillBlocked).toBe(beforeStart);

  await page.click("#start-game-btn");
  await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());
  await page.waitForTimeout(1500);

  const afterStart = parseInt((await page.locator("#timer-value").textContent()) || "0", 10);
  expect(afterStart).toBeLessThan(beforeStart);
});
```

- [ ] **Step 2: Run tests to verify the current split state fails**

Run: `npx playwright test tests/runtime-boot-orchestration.spec.js tests/install-prompt.spec.js tests/timer.spec.js --reporter=line`
Expected: FAIL because timer start, install gating, and Evan input lock are still driven by separate booleans and body classes.

- [ ] **Step 3: Migrate the consumers to the coordinator**

```javascript
// src/scripts/install-prompt.js
function tryShow() {
  if (shown || !deferredPrompt) return;
  if (!storage.shouldShowInstallPrompt()) return;
  if (!window.GameRuntimeCoordinator?.isGameplayReady?.()) return;
  showInstallUI();
}

document.addEventListener(GE.GAMEPLAY_READY_CHANGED, (event) => {
  if (event.detail?.gameplayReady) {
    tryShow();
  }
});
```

```javascript
// src/scripts/game-init.js
if (GE?.GAMEPLAY_READY_CHANGED && window.ScoreTimerManager) {
  document.addEventListener(GE.GAMEPLAY_READY_CHANGED, (event) => {
    if (event.detail?.gameplayReady) {
      window.ScoreTimerManager.setGameStarted();
    }
  });
}
```

```javascript
// src/scripts/evan-helper.presenter.js
function setInputLock(locked) {
  window.GameRuntimeCoordinator?.setInputLock?.("evan-auto", locked);
  document.body.classList.toggle("evan-input-locked", locked);
  if (locked && skipBtn && !skipBtn.hidden) {
    skipBtn.focus({ preventScroll: true });
  }
}

function guardLockedUserInput(event) {
  if (!window.GameRuntimeCoordinator?.getState?.().inputLocked) return;
  if (event.type !== "keydown" && !event.isTrusted) return;
  if (isSkipInteractionTarget(event.target)) return;
  if (event.type === "keydown" && isAllowedSkipKey(event)) return;

  if (skipBtn && !skipBtn.hidden && document.activeElement !== skipBtn) {
    skipBtn.focus({ preventScroll: true });
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}
```

```javascript
// src/scripts/score-timer-manager.js
setGameStarted() {
  if (this._gameStarted) return;
  if (!window.GameRuntimeCoordinator?.isGameplayReady?.()) return;
  this._gameStarted = true;
  if (this._problemStarted && !this._paused) {
    this.startStep();
  }
}
```

- [ ] **Step 4: Run focused regression tests to verify the migration**

Run: `npx playwright test tests/runtime-boot-orchestration.spec.js tests/install-prompt.spec.js tests/timer.spec.js tests/evan-helper.symbols.spec.js tests/evan-helper.worms.spec.js --reporter=line`
Expected: PASS, including install prompt dismissal, timer countdown, and Evan interaction behavior.

- [ ] **Step 5: Commit**

```bash
git add tests/runtime-boot-orchestration.spec.js tests/install-prompt.spec.js tests/timer.spec.js src/scripts/install-prompt.js src/scripts/game-init.js src/scripts/score-timer-manager.js src/scripts/evan-helper.presenter.js
git commit -m "refactor: migrate timer install prompt and input lock to coordinator"
```

### Task 4: Update Gameplay Boot Helpers And Cross-Suite Regression Coverage

**Files:**
- Modify: `tests/utils/onboarding-runtime.js`
- Modify: `tests/e2e-full-game-critical.spec.js`
- Modify: `tests/e2e-full-game-stress.spec.js`
- Modify: `tests/powerups.spec.js`
- Modify: `src/scripts/worm-powerups.selection.js`

- [ ] **Step 1: Add a shared readiness helper and make the failing suites use it**

```javascript
// tests/utils/onboarding-runtime.js
export async function waitForGameplayReady(page) {
  await page.waitForFunction(
    () => window.GameRuntimeCoordinator?.isGameplayReady?.() === true,
    { timeout: 10000 },
  );
}
```

```javascript
// tests/e2e-full-game-critical.spec.js
async function bootLevel(page, level) {
  await page.goto(`/game.html?level=${level}`, {
    waitUntil: "domcontentloaded",
  });
  const howToPlayModal = page.locator("#how-to-play-modal");
  await expect(howToPlayModal).toBeVisible({ timeout: 10000 });
  await page.evaluate(() => {
    const button = document.getElementById("start-game-btn");
    if (button) button.click();
  });
  await expect(howToPlayModal).toBeHidden({ timeout: 5000 });
  await page.waitForFunction(() => window.GameRuntimeCoordinator?.isGameplayReady?.());
  await page.waitForFunction(() => window.wormSystem?.isInitialized === true);
  await page.waitForFunction(
    () => document.querySelectorAll(".hidden-symbol").length > 0,
  );
  await page.evaluate(() => window.ScoreTimerManager?.pause?.());
}
```

```javascript
// tests/powerups.spec.js
await page.waitForFunction(() => window.GameRuntimeCoordinator?.canAcceptGameplayInput?.());
```

- [ ] **Step 2: Run the affected suites to verify they still fail before the production guard is added**

Run: `npx playwright test tests/e2e-full-game-critical.spec.js tests/e2e-full-game-stress.spec.js tests/powerups.spec.js --reporter=line`
Expected: At least one failure remains because power-up placement can still attach while the runtime is input-locked.

- [ ] **Step 3: Add the gameplay-input guard to power-up placement**

```javascript
// src/scripts/worm-powerups.selection.js
proto.selectPowerUp = function (type) {
  if (!window.GameRuntimeCoordinator?.canAcceptGameplayInput?.()) {
    this._showTooltip("Gameplay is not ready yet.", "warning");
    return;
  }

  if (this.selectedPowerUp === type) {
    this.deselectPowerUp();
    return;
  }

  if (this.inventory[type] <= 0) {
    console.log(`⚠️ No ${type} power-ups available!`);
    this._showTooltip(`No ${this.EMOJIS[type]} available!`, "warning");
    return;
  }

  if (this.selectedPowerUp) {
    this.deselectPowerUp();
  }

  this.selectedPowerUp = type;
  this.isPlacementMode = true;
  this._dispatchSelectionChanged();
  this._showTooltip(`${this.EMOJIS[type]} selected - ${this.DESCRIPTIONS[type]}`, "info");
  document.body.style.cursor = "crosshair";
  document.body.classList.add("power-up-placement-mode");
  document.documentElement.classList.add("power-up-placement-mode");

  if (document.activeElement && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  requestAnimationFrame(() => {
    if (!this.selectedPowerUp) return;
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
  });

  this._setupPlacementHandler(type);
};
```

- [ ] **Step 4: Run the shared gameplay regression lanes**

Run: `npx playwright test tests/powerups.spec.js tests/e2e-full-game-critical.spec.js tests/e2e-full-game-stress.spec.js --reporter=line`
Expected: PASS for power-up selection/placement and the full-game critical and stress paths across all configured browsers.

- [ ] **Step 5: Commit**

```bash
git add tests/utils/onboarding-runtime.js tests/e2e-full-game-critical.spec.js tests/e2e-full-game-stress.spec.js tests/powerups.spec.js src/scripts/worm-powerups.selection.js
git commit -m "refactor: align gameplay interactions with coordinator readiness"
```

### Task 5: Run Full Verification And Check The Scoreboard Outlier Separately

**Files:**
- Test: `tests/onboarding-gates.spec.js`
- Test: `tests/install-prompt.spec.js`
- Test: `tests/timer.spec.js`
- Test: `tests/evan-helper.symbols.spec.js`
- Test: `tests/evan-helper.worms.spec.js`
- Test: `tests/powerups.spec.js`
- Test: `tests/e2e-full-game-critical.spec.js`
- Test: `tests/e2e-full-game-stress.spec.js`
- Test: `tests/level-select-scoreboard.spec.js`

- [ ] **Step 1: Run the focused coordinator-related Playwright suite**

Run: `npx playwright test tests/runtime-boot-orchestration.spec.js tests/onboarding-gates.spec.js tests/install-prompt.spec.js tests/timer.spec.js tests/evan-helper.symbols.spec.js tests/evan-helper.worms.spec.js tests/powerups.spec.js --reporter=line`
Expected: PASS.

- [ ] **Step 2: Run the cross-browser end-to-end gameplay coverage**

Run: `npx playwright test tests/e2e-full-game-critical.spec.js tests/e2e-full-game-stress.spec.js --reporter=line`
Expected: PASS.

- [ ] **Step 3: Run the level-select scoreboard outlier in isolation**

Run: `npx playwright test tests/level-select-scoreboard.spec.js --reporter=line`
Expected: PASS. If it fails, create a separate follow-up plan for level-select storage migration rather than folding more code into this refactor.

- [ ] **Step 4: Run repository verification commands**

Run: `npm run verify`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run test:competition:smoke`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/game.html src/scripts/constants.events.js src/scripts/game-runtime-coordinator.js src/scripts/startup-preload.js src/scripts/game-page.js src/scripts/game-onboarding.controller.js src/scripts/install-prompt.js src/scripts/game-init.js src/scripts/score-timer-manager.js src/scripts/evan-helper.presenter.js src/scripts/worm-powerups.selection.js tests/runtime-boot-orchestration.spec.js tests/utils/onboarding-runtime.js tests/onboarding-gates.spec.js tests/install-prompt.spec.js tests/timer.spec.js tests/e2e-full-game-critical.spec.js tests/e2e-full-game-stress.spec.js tests/powerups.spec.js
git commit -m "refactor: unify runtime boot orchestration"
```