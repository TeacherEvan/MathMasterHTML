# Console Reward Activation Follow-up Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reapply the local-only console reward activation commit onto a fresh branch from `origin/main`, validate it against the console-selection gameplay lane, and publish it as a standalone follow-up PR.

**Architecture:** Keep the existing browser-native console runtime intact, but transplant commit `3708ec5` from `safety/local-main-console-reward-activation` onto a new branch rooted at current `origin/main`. The only runtime surface is `src/scripts/console-manager.events.js`; the only automated validation surface is the console-selection section of `tests/gameplay-features.spec.js`.

**Tech Stack:** Git worktrees, browser-native JavaScript with `window.*` globals, Playwright, and TypeScript typecheck.

---

## File Structure

- Modify: `src/scripts/console-manager.events.js`
  Responsibility: unify pointer and click activation handling so touch activation is immediate while follow-up synthetic clicks are deduplicated.
- Modify: `tests/gameplay-features.spec.js`
  Responsibility: validate pointer, click, and keyboard activation for the console selection panel and ensure manual reward selection advances the problem index deterministically.
- Verify Only: `.worktrees/console-reward-activation-followup/`
  Responsibility: isolated worktree rooted at `origin/main` for the follow-up branch.

## Design Constraints

- Base the follow-up branch on `origin/main`, not the diverged local `main` worktree.
- Preserve the script-tag runtime and `window.ConsoleManager.prototype` methods.
- Keep the dedupe window local to the clicked element via `WeakMap`.
- Do not widen the scope beyond the two files already touched by commit `3708ec5`.

## Out Of Scope

- Rewriting the console UI layout or modal markup.
- Syncing or resetting the existing root `main` worktree.
- Cleaning up merged worktrees and branches from PR `#71`.

### Task 1: Create A Clean Follow-up Branch From `origin/main`

**Files:**
- Verify Only: `.worktrees/console-reward-activation-followup/`

- [ ] **Step 1: Create an isolated worktree from the current remote main head**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML worktree add \
  /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup \
  -b feature/console-reward-activation-followup \
  origin/main
```

- [ ] **Step 2: Verify the new branch is clean before transplanting the patch**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup status --short --branch`
Expected: `## feature/console-reward-activation-followup...origin/main` with no modified files.

- [ ] **Step 3: Cherry-pick the preserved local-main commit onto the new branch**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup \
  cherry-pick 3708ec52ef2144e65492e2d77b79d58bf1dd12f5
```

Expected: either a clean cherry-pick or a stop with conflicts only in `src/scripts/console-manager.events.js` and `tests/gameplay-features.spec.js`.

- [ ] **Step 4: If the cherry-pick conflicts, make the console event wiring match this exact runtime shape**

```javascript
// src/scripts/console-manager.events.js
const POINTER_FOLLOWUP_CLICK_WINDOW_MS = 400;
const recentPointerActivations = new WeakMap();

function shouldIgnoreFollowupClick(element) {
  const lastPointerActivation = recentPointerActivations.get(element);

  if (typeof lastPointerActivation !== "number") {
    return false;
  }

  recentPointerActivations.delete(element);
  return performance.now() - lastPointerActivation <
    POINTER_FOLLOWUP_CLICK_WINDOW_MS;
}

function bindPrimaryActivation(element, handler) {
  if (!element) {
    return;
  }

  if (window.PointerEvent) {
    element.addEventListener(
      "pointerdown",
      (event) => {
        recentPointerActivations.set(element, performance.now());
        event.preventDefault();
        handler(event);
      },
      { passive: false },
    );

    element.addEventListener("click", (event) => {
      if (shouldIgnoreFollowupClick(element)) {
        return;
      }

      handler(event);
    });
    return;
  }

  element.addEventListener("click", handler);
}

// Later in the same file:
bindPrimaryActivation(slot, handleConsoleClick);
bindPrimaryActivation(btn, () => {
  this.selectSymbol(btn.dataset.symbol);
});
bindPrimaryActivation(btn, () => {
  const position = Number.parseInt(btn.dataset.position, 10);
  this.selectPosition(position);
});
bindPrimaryActivation(document.getElementById("skip-button"), () => {
  this.skipSelection();
});
```

- [ ] **Step 5: If the cherry-pick conflicts, make the gameplay test helper and keyboard flow match this exact test contract**

```javascript
// tests/gameplay-features.spec.js
async function activateConsoleButton(locator, activation = "pointerdown") {
  if (activation === "click") {
    await locator.click();
    return;
  }

  if (activation === "keyboard") {
    await locator.focus();
    await locator.press("Enter");
    return;
  }

  await locator.dispatchEvent("pointerdown");
}

async function chooseConsoleReward(
  page,
  { symbol = "1", position = 0, activation = "pointerdown" } = {},
) {
  await activateConsoleButton(
    page.locator(`.symbol-choice[data-symbol="${symbol}"]`),
    activation,
  );
  await expect(page.locator("#position-choices")).toBeVisible();
  await activateConsoleButton(
    page.locator(`.position-choice[data-position="${position}"]`),
    activation,
  );
  await page.waitForFunction(
    () => window.consoleManager?.isPendingSelection === false,
  );
}

test("manual selection and autofill both still advance to the next problem", async ({
  page,
}) => {
  await chooseConsoleReward(page, {
    symbol: "1",
    position: 0,
    activation: "click",
  });

  expect(manualState.index).toBe(beforeIndex + 1);
});

test("keyboard activation can complete a reward selection flow", async ({
  page,
}) => {
  await chooseConsoleReward(page, {
    symbol: "1",
    position: 0,
    activation: "keyboard",
  });

  expect(rewardState.index).toBe(beforeIndex + 1);
  expect(rewardState.slotValue).toBe("1");
});
```

- [ ] **Step 6: Finish the cherry-pick commit if conflict resolution was needed**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup add \
  src/scripts/console-manager.events.js \
  tests/gameplay-features.spec.js
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup \
  cherry-pick --continue
```

Expected: commit message remains `feat: enhance console reward selection with activation options`.

### Task 2: Validate And Publish The Follow-up Branch

**Files:**
- Modify: `src/scripts/console-manager.events.js`
- Modify: `tests/gameplay-features.spec.js`

- [ ] **Step 1: Run the focused console-selection Playwright lane**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup && npx playwright test tests/gameplay-features.spec.js -g "Console Selection Panel|keyboard activation can complete a reward selection flow" --reporter=line`
Expected: PASS for the dedicated no-scroll window tests and the keyboard reward-selection flow.

- [ ] **Step 2: Run typecheck on the follow-up branch**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup && npm run typecheck`
Expected: PASS with `npx tsc --noEmit --project tsconfig.typecheck.json`.

- [ ] **Step 3: Push the branch to GitHub**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/console-reward-activation-followup \
  push -u origin feature/console-reward-activation-followup
```

- [ ] **Step 4: Open the standalone follow-up PR**

```text
Title: feat: restore console reward activation follow-up

Body:
- reapplies local-only commit 3708ec5 on top of current origin/main
- keeps pointerdown activation immediate while suppressing duplicate follow-up clicks
- proves click and keyboard reward selection flows in gameplay-features.spec.js
```
