# Console Selection Panel Separation Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the between-problem console button selection flow into its own dedicated selection window so players choose a symbol and slot in a fixed, non-scrolling panel instead of the current draggable floating modal.

**Architecture:** Keep the existing event contract of `problemCompleted -> console selection -> consoleSymbolAdded -> nextProblem`, but replace the floating modal presentation with a dedicated selection-panel shell that has a fixed-size window, both choice grids visible at once, and responsive compression instead of scrollbars. Preserve the browser-native `window.*` runtime and DOM-event integration, while moving interaction and accessibility logic toward explicit panel-state updates rather than ad hoc `display` toggles.

**Tech Stack:** Browser-native HTML/CSS/JavaScript, `window.*` globals, DOM `CustomEvent` contracts, existing `GameEvents` constants, Playwright end-to-end tests.

---

## File Structure

- Modify: `src/pages/game.html`
  Responsibility: replace the old draggable modal markup with a dedicated console selection window shell and a no-scroll layout structure.
- Modify: `src/styles/css/console.modal.css`
  Responsibility: remove floating draggable modal behavior and define the dedicated selection window visuals, sizing, and overflow rules.
- Modify: `src/styles/css/console.responsive.css`
  Responsibility: ensure the new selection window fits compact landscape/mobile viewports without introducing internal or page scrolling.
- Modify: `src/scripts/console-manager.core.js`
  Responsibility: cache the new panel elements and keep the existing problem-completion hook pointed at the new selection surface.
- Modify: `src/scripts/console-manager.ui.js`
  Responsibility: open and close the dedicated panel, keep both grids visible, update status copy, and avoid the old step-2 show/hide expansion behavior.
- Modify: `src/scripts/console-manager.events.js`
  Responsibility: switch selection-panel controls to `pointerdown` semantics, remove drag/close wiring, and keep skip/autofill progression intact.
- Modify: `src/scripts/console-manager.ui.accessibility.js`
  Responsibility: maintain dialog semantics, focus trapping, `aria-hidden`, and live status updates for the new panel structure.
- Modify: `src/scripts/constants.events.js`
  Responsibility: optionally add panel open/close event names so runtime observers and tests can assert on the dedicated panel lifecycle through shared constants.
- Modify: `tests/gameplay-features.spec.js`
  Responsibility: replace stale floating-modal expectations with the dedicated no-scroll selection-panel contract and preserve next-problem progression coverage.

## Out Of Scope

- Redesigning the 3x3 console slot grid itself.
- Changing worm spawn rules, lock progression timing, or symbol rain behavior.
- Adding a framework, imports, or bundler-only patterns to the runtime.

### Task 1: Lock The New No-Scroll Selection Contract In Playwright

**Files:**
- Modify: `tests/gameplay-features.spec.js`

- [ ] **Step 1: Rewrite the console-panel tests so they describe the approved dedicated-window behavior**

```javascript
// tests/gameplay-features.spec.js
/**
 *  5. Console selection panel opens as its own dedicated no-scroll window
 */

test.describe("Console Selection Panel — Dedicated No-Scroll Window", () => {
  test.beforeEach(async ({ page }) => startGame(page));

  test("selection panel opens as a dedicated window without internal scrolling", async ({
    page,
  }) => {
    await openConsoleSelectionModal(page);

    const panelState = await page.evaluate(() => {
      const shell = document.getElementById("symbol-modal");
      const windowEl = shell?.querySelector(".console-selection-window");
      const positionGrid = document.getElementById("position-choices");

      if (!shell || !windowEl || !positionGrid) return null;

      const shellStyle = window.getComputedStyle(shell);
      const windowStyle = window.getComputedStyle(windowEl);
      const positionStyle = window.getComputedStyle(positionGrid);

      return {
        shellDisplay: shellStyle.display,
        overflowY: windowStyle.overflowY,
        clientHeight: windowEl.clientHeight,
        scrollHeight: windowEl.scrollHeight,
        positionGridDisplay: positionStyle.display,
      };
    });

    expect(panelState).toBeTruthy();
    expect(panelState.shellDisplay).toBe("grid");
    expect(panelState.overflowY).toBe("hidden");
    expect(panelState.scrollHeight).toBeLessThanOrEqual(
      panelState.clientHeight + 1,
    );
    expect(panelState.positionGridDisplay).toBe("grid");
  });

  test("selecting a symbol updates the panel state without expanding the window", async ({
    page,
  }) => {
    await openConsoleSelectionModal(page);

    const beforeHeight = await page.locator(".console-selection-window").evaluate(
      (node) => node.getBoundingClientRect().height,
    );

    await page.locator(".symbol-choice[data-symbol='1']").click();
    await expect(page.locator(".symbol-choice[data-symbol='1']")).toHaveClass(
      /selected/,
    );

    const panelState = await page.evaluate(() => {
      const windowEl = document.querySelector(".console-selection-window");
      const status = document.getElementById("console-selection-status");
      return windowEl && status
        ? {
            afterHeight: windowEl.getBoundingClientRect().height,
            statusText: status.textContent,
          }
        : null;
    });

    expect(panelState).toBeTruthy();
    expect(Math.abs(panelState.afterHeight - beforeHeight)).toBeLessThanOrEqual(
      1,
    );
    expect(panelState.statusText).toContain("Choose a slot");
  });

  test("manual selection and autofill both still advance to the next problem", async ({
    page,
  }) => {
    const beforeIndex = await page.evaluate(
      () => window.GameProblemManager?.currentProblemIndex ?? -1,
    );

    await openConsoleSelectionModal(page);
    await chooseConsoleReward(page, { symbol: "1", position: 0 });

    await page.waitForFunction(
      (previousIndex) =>
        (window.GameProblemManager?.currentProblemIndex ?? -1) !==
        previousIndex,
      beforeIndex,
    );

    const manualState = await page.evaluate(() => ({
      index: window.GameProblemManager?.currentProblemIndex ?? -1,
      slotValue: window.consoleManager?.slots?.[0] ?? null,
    }));

    expect(manualState.index).not.toBe(beforeIndex);
    expect(manualState.slotValue).toBe("1");

    const nextIndex = manualState.index;
    await openConsoleSelectionModal(page);
    await page.locator("#skip-button").click();

    await page.waitForFunction(
      (previousIndex) =>
        (window.GameProblemManager?.currentProblemIndex ?? -1) !==
        previousIndex,
      nextIndex,
    );
  });
});
```

- [ ] **Step 2: Run the focused console-panel lane and verify it fails for the right reasons**

Run: `npx playwright test tests/gameplay-features.spec.js -g "Console Selection Panel" --reporter=line`
Expected: FAIL because the current implementation still uses `.modal-content`, keeps `overflow-y: auto`, hides `#position-choices` until after symbol selection, and exposes floating-panel affordances that do not match the new contract.

- [ ] **Step 3: Keep the helper names but update stale test comments and selectors alongside the new assertions**

```javascript
// tests/gameplay-features.spec.js
async function openConsoleSelectionModal(page) {
  await page.waitForFunction(
    () =>
      !!window.consoleManager &&
      !!window.consoleManager.modal &&
      window.consoleManager.isPendingSelection === false,
  );

  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent("problemCompleted"));
  });

  await page.waitForFunction(() => {
    const panel = document.getElementById("symbol-modal");
    return !!panel && window.getComputedStyle(panel).display !== "none";
  });

  await expect(page.locator(".console-selection-window")).toBeVisible();
  await expect(page.locator(".symbol-choice[data-symbol='1']")).toBeVisible();
}
```

- [ ] **Step 4: Re-run the focused lane to confirm the tests still fail only because the runtime has not been updated yet**

Run: `npx playwright test tests/gameplay-features.spec.js -g "Console Selection Panel" --reporter=line`
Expected: FAIL with assertion mismatches around panel structure and no-scroll behavior, not with unrelated preload, worm, or navigation errors.

- [ ] **Step 5: Commit**

```bash
git add tests/gameplay-features.spec.js
git commit -m "test: define dedicated console selection panel behavior"
```

### Task 2: Replace The Floating Modal Markup And CSS With A Dedicated Window

**Files:**
- Modify: `src/pages/game.html`
- Modify: `src/styles/css/console.modal.css`
- Modify: `src/styles/css/console.responsive.css`

- [ ] **Step 1: Replace the old modal shell in the game page with a dedicated selection-window structure**

```html
<!-- src/pages/game.html -->
<!-- Console Selection Panel -->
<div id="symbol-modal" class="console-selection-shell" style="display: none;" aria-hidden="true">
    <section class="console-selection-window" role="dialog" aria-modal="true"
        aria-labelledby="symbol-modal-title" aria-describedby="symbol-modal-description" tabindex="-1">
        <header class="console-selection-header">
            <p class="console-selection-kicker">Intermission reward</p>
            <h2 id="symbol-modal-title">Load The Console</h2>
            <p id="symbol-modal-description" class="console-selection-copy">
                Pick a symbol, then choose which console slot should carry it into the next problem.
            </p>
        </header>

        <div class="console-selection-body">
            <section class="console-selection-card" aria-labelledby="symbol-choice-title">
                <h3 id="symbol-choice-title">1. Choose symbol</h3>
                <div id="symbol-choices" class="symbol-grid">
                    <button class="symbol-choice" data-symbol="0" type="button">0</button>
                    <button class="symbol-choice" data-symbol="1" type="button">1</button>
                    <button class="symbol-choice" data-symbol="2" type="button">2</button>
                    <button class="symbol-choice" data-symbol="3" type="button">3</button>
                    <button class="symbol-choice" data-symbol="4" type="button">4</button>
                    <button class="symbol-choice" data-symbol="5" type="button">5</button>
                    <button class="symbol-choice" data-symbol="6" type="button">6</button>
                    <button class="symbol-choice" data-symbol="7" type="button">7</button>
                    <button class="symbol-choice" data-symbol="8" type="button">8</button>
                    <button class="symbol-choice" data-symbol="9" type="button">9</button>
                    <button class="symbol-choice" data-symbol="X" type="button">X</button>
                    <button class="symbol-choice" data-symbol="+" type="button">+</button>
                    <button class="symbol-choice" data-symbol="-" type="button">-</button>
                    <button class="symbol-choice" data-symbol="=" type="button">=</button>
                    <button class="symbol-choice" data-symbol="÷" type="button">÷</button>
                    <button class="symbol-choice" data-symbol="×" type="button">×</button>
                </div>
            </section>

            <section class="console-selection-card" aria-labelledby="position-choice-title">
                <h3 id="position-choice-title">2. Choose slot</h3>
                <div id="position-choices" class="position-grid">
                    <button class="position-choice" data-position="0" type="button">1</button>
                    <button class="position-choice" data-position="1" type="button">2</button>
                    <button class="position-choice" data-position="2" type="button">3</button>
                    <button class="position-choice" data-position="3" type="button">4</button>
                    <button class="position-choice" data-position="4" type="button">5</button>
                    <button class="position-choice" data-position="5" type="button">6</button>
                    <button class="position-choice" data-position="6" type="button">7</button>
                    <button class="position-choice" data-position="7" type="button">8</button>
                    <button class="position-choice" data-position="8" type="button">9</button>
                </div>
            </section>
        </div>

        <footer class="console-selection-footer">
            <p id="console-selection-status" class="console-selection-status">Choose a symbol to unlock the slot grid.</p>
            <button id="skip-button" class="console-selection-autofill" type="button">Auto-fill for me</button>
        </footer>
    </section>
</div>
```

- [ ] **Step 2: Replace the floating-modal CSS with a fixed-size no-scroll selection window**

```css
/* src/styles/css/console.modal.css */
.console-selection-shell {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: none;
  place-items: center;
  padding: 16px;
  background:
    radial-gradient(circle at top, rgba(0, 255, 0, 0.08), transparent 46%),
    rgba(0, 0, 0, 0.7);
}

.console-selection-window {
  width: min(720px, calc(100vw - 32px));
  height: min(520px, calc(100vh - 32px));
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  padding: 18px;
  overflow: hidden;
  border: 2px solid #00ff00;
  border-radius: 16px;
  background: linear-gradient(160deg, #040b04 0%, #0b170b 54%, #081108 100%);
  box-shadow:
    0 0 0 1px rgba(0, 255, 0, 0.18),
    0 0 28px rgba(0, 255, 0, 0.28),
    0 18px 48px rgba(0, 0, 0, 0.82);
}

.console-selection-body {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 14px;
}

.console-selection-card {
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(0, 255, 0, 0.18);
  border-radius: 12px;
  background: rgba(0, 16, 0, 0.58);
  overflow: hidden;
}

.symbol-grid,
.position-grid {
  margin: 0;
  align-content: start;
}

.console-selection-status {
  margin: 0;
  min-height: 1.4em;
  font-family: "Orbitron", monospace;
  font-size: 11px;
  color: rgba(120, 255, 255, 0.88);
}

.console-selection-autofill {
  justify-self: end;
}

body.console-selection-active {
  overflow: hidden;
}
```

- [ ] **Step 3: Add responsive compression rules instead of allowing scrolling**

```css
/* src/styles/css/console.responsive.css */
@media (max-width: 900px), (max-height: 560px) {
  .console-selection-shell {
    padding: 10px;
  }

  .console-selection-window {
    width: min(680px, calc(100vw - 20px));
    height: min(400px, calc(100vh - 20px));
    gap: 10px;
    padding: 12px;
  }

  .console-selection-body {
    gap: 10px;
  }

  .symbol-choice {
    font-size: 18px;
  }

  .position-choice {
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  .console-selection-window {
    width: calc(100vw - 12px);
    height: min(340px, calc(100vh - 12px));
    border-radius: 12px;
  }

  .console-selection-body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .console-selection-card {
    padding: 8px;
  }

  .symbol-grid,
  .position-grid {
    gap: 6px;
  }
}
```

- [ ] **Step 4: Run the focused console-panel lane and make the layout tests pass**

Run: `npx playwright test tests/gameplay-features.spec.js -g "Console Selection Panel" --reporter=line`
Expected: PASS for the no-scroll structure assertions, while interaction-state tests may still fail until the JavaScript logic is updated in the next task.

- [ ] **Step 5: Commit**

```bash
git add src/pages/game.html src/styles/css/console.modal.css src/styles/css/console.responsive.css
git commit -m "feat: add dedicated console selection window"
```

### Task 3: Refactor Console Selection Logic Around The Dedicated Panel

**Files:**
- Modify: `src/scripts/console-manager.core.js`
- Modify: `src/scripts/console-manager.ui.js`
- Modify: `src/scripts/console-manager.events.js`
- Modify: `src/scripts/console-manager.ui.accessibility.js`
- Modify: `src/scripts/constants.events.js`
- Modify: `tests/gameplay-features.spec.js`

- [ ] **Step 1: Extend the runtime contract with explicit selection-panel lifecycle events and element caching**

```javascript
// src/scripts/constants.events.js
(function () {
  window.GameEvents = Object.freeze({
    COMBO_UPDATED: "comboUpdated",
    CONSOLE_SYMBOL_ADDED: "consoleSymbolAdded",
    CONSOLE_SELECTION_OPENED: "consoleSelectionOpened",
    CONSOLE_SELECTION_CLOSED: "consoleSelectionClosed",
    DISPLAY_RESOLUTION_CHANGED: "displayResolutionChanged",
    FIRST_LINE_SOLVED: "first-line-solved",
    PROBLEM_COMPLETED: "problemCompleted",
    // ...keep existing event names unchanged
  });
})();
```

```javascript
// src/scripts/console-manager.core.js
setup() {
  this.consoleElement = document.getElementById("symbol-console");
  this.modal = document.getElementById("symbol-modal");
  this.selectionStatusElement = document.getElementById(
    "console-selection-status",
  );

  if (!this.consoleElement || !this.modal || !this.selectionStatusElement) {
    console.error("❌ Console selection elements not found in DOM");
    return;
  }

  this.loadProgress();
  this.setupConsoleButtons();
  this.setupModalInteractions();
  this.setupKeyboardShortcuts();

  document.addEventListener(GameEvents.PROBLEM_COMPLETED, () => {
    console.log("🎉 Problem completed! Opening console selection panel");
    this.incrementProblemsCompleted();
    this.showSymbolSelectionModal();
  });
}
```

- [ ] **Step 2: Replace the old show-hide-step logic with explicit panel-state updates**

```javascript
// src/scripts/console-manager.ui.js
proto.showSymbolSelectionModal = function() {
  if (this.isPendingSelection) {
    return;
  }

  this.isPendingSelection = true;
  this.selectedSymbol = null;
  this.selectedPosition = null;

  document.querySelectorAll(".symbol-choice").forEach((btn) => {
    btn.classList.remove("selected");
  });

  this.updatePositionButtons();
  this.updateSelectionStatus();

  document.body.classList.add("console-selection-active");
  this.modal.style.display = "grid";
  this._applySymbolModalAccessibility?.();

  document.dispatchEvent(
    new CustomEvent((window.GameEvents || {}).CONSOLE_SELECTION_OPENED),
  );
};

proto.hideSymbolSelectionModal = function() {
  this._releaseSymbolModalAccessibility?.();
  document.body.classList.remove("console-selection-active");
  this.modal.style.display = "none";
  this.isPendingSelection = false;

  document.dispatchEvent(
    new CustomEvent((window.GameEvents || {}).CONSOLE_SELECTION_CLOSED),
  );
};

proto.selectSymbol = function(symbol) {
  this.selectedSymbol = symbol;

  document.querySelectorAll(".symbol-choice").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.symbol === symbol);
  });

  this.updatePositionButtons();
  this.updateSelectionStatus();
};

proto.updateSelectionStatus = function() {
  if (!this.selectionStatusElement) {
    return;
  }

  this.selectionStatusElement.textContent = this.selectedSymbol
    ? `Symbol ${this.selectedSymbol} selected. Choose a slot.`
    : "Choose a symbol to unlock the slot grid.";
};

proto.updatePositionButtons = function() {
  const positionButtons = document.querySelectorAll(".position-choice");

  positionButtons.forEach((btn, index) => {
    const occupiedSymbol = this.slots[index];
    const canChooseSlot = Boolean(this.selectedSymbol);

    btn.disabled = !canChooseSlot;
    btn.classList.toggle("disabled", !canChooseSlot);
    btn.textContent = occupiedSymbol ? `Swap ${occupiedSymbol}` : `${index + 1}`;
  });
};
```

- [ ] **Step 3: Move the panel interactions to `pointerdown`, remove drag wiring, and keep autofill behavior intact**

```javascript
// src/scripts/console-manager.events.js
proto.setupModalInteractions = function() {
  const bindPress = (element, handler) => {
    if (!element) return;

    if (window.PointerEvent) {
      element.addEventListener(
        "pointerdown",
        (event) => {
          event.preventDefault();
          handler(event);
        },
        { passive: false },
      );
      return;
    }

    element.addEventListener("click", handler);
  };

  document.querySelectorAll(".symbol-choice").forEach((btn) => {
    bindPress(btn, () => this.selectSymbol(btn.dataset.symbol));
  });

  document.querySelectorAll(".position-choice").forEach((btn) => {
    bindPress(btn, () => {
      const position = Number.parseInt(btn.dataset.position, 10);
      this.selectPosition(position);
    });
  });

  bindPress(document.getElementById("skip-button"), () => {
    this.skipSelection();
  });

  this.modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && this.isPendingSelection) {
      event.preventDefault();
      this.skipSelection();
    }
  });

  console.log("✅ Console selection panel interactions set up");
};
```

```javascript
// src/scripts/console-manager.ui.accessibility.js
proto._applySymbolModalAccessibility = function() {
  this.modal?.setAttribute("aria-hidden", "false");
  this.selectionStatusElement?.setAttribute("aria-live", "polite");
  this._modalFocusCleanup =
    window.UXModules?.AccessibilityManager?.trapFocus?.(
      this.modal?.querySelector(".console-selection-window"),
      {
        initialFocus: () =>
          this.modal?.querySelector(".symbol-choice") ||
          this.modal?.querySelector("#skip-button"),
      },
    ) || null;
};

proto._releaseSymbolModalAccessibility = function() {
  if (typeof this._modalFocusCleanup === "function") {
    this._modalFocusCleanup();
    this._modalFocusCleanup = null;
  }

  this.modal?.setAttribute("aria-hidden", "true");
};
```

- [ ] **Step 4: Run the affected verification commands until the dedicated panel passes its behavior checks**

Run: `npx playwright test tests/gameplay-features.spec.js -g "Console Selection Panel" --reporter=line`
Expected: PASS for no-scroll layout, symbol selection, slot selection, autofill progression, and next-problem advancement.

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run verify`
Expected: PASS or only pre-existing unrelated failures. If unrelated failures appear, capture them and do not expand scope to fix them here.

Run: `npx playwright test tests/gameplay-features.spec.js --project=pixel-7 -g "Console Selection Panel" --reporter=line`
Expected: PASS, confirming the new panel fits a compact landscape mobile viewport without internal scrolling.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/constants.events.js src/scripts/console-manager.core.js src/scripts/console-manager.ui.js src/scripts/console-manager.events.js src/scripts/console-manager.ui.accessibility.js tests/gameplay-features.spec.js
git commit -m "refactor: separate console selection into fixed panel"
```

## Self-Review

### Spec Coverage

- The plan moves the between-problem console selection flow into its own dedicated window.
- The plan removes the floating draggable behavior and replaces it with a dedicated selection-panel shell.
- The plan makes the panel no-scroll by enforcing fixed sizing and `overflow: hidden` plus responsive compression.
- The plan preserves existing progression behavior so manual selection and autofill still advance to the next problem.

### Placeholder Scan

- No `TODO`, `TBD`, or "write tests for the above" placeholders remain.
- Every code-changing step includes concrete code blocks, exact files, and exact commands.

### Type Consistency

- The plan consistently keeps the runtime entry id as `symbol-modal` to avoid wider breakage.
- The plan uses `.console-selection-window` as the new internal shell class across markup, CSS, accessibility, and tests.
- The plan consistently preserves `problemCompleted` and `consoleSymbolAdded` as the progression contract while adding optional `CONSOLE_SELECTION_OPENED` and `CONSOLE_SELECTION_CLOSED` event names.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-07-console-selection-panel-separation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using the `executing-plans` agent, batch execution with checkpoints

**Which approach?**