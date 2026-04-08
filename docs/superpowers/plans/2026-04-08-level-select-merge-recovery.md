# Level Select Merge Recovery Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the compact level-select route flow on `merge/main-2026-04-08` so keyboard activation, CTA launches, back navigation, narrow-mobile layout, and scoreboard coverage all pass again.

**Architecture:** Keep the existing split between markup, interaction logic, CSS, and Playwright coverage. This recovery should be a targeted port of the known-good local follow-up branch: the current page markup and progress script stay intact, the interaction layer switches back to browser-native click semantics, and the mobile CSS reclaims the compact one-panel layout without reintroducing full-card launching.

**Tech Stack:** Browser-native HTML/CSS/JavaScript, Playwright, npm verify, npm typecheck.

---

**Scope Note:** This plan covers only the level-select regression slice. Draft separate follow-up plans for Evan/runtime locking, UI-boundary mobile regressions, worm rewards, install-toast specificity, and performance budget drift.

## File Structure

- Verify Only: `src/pages/level-select.html`
  Responsibility: confirm the compact route-switcher markup already present on the integration branch stays unchanged.
- Modify: `src/scripts/level-select-page.interactions.js`
  Responsibility: restore click-based event wiring for CTA buttons, compact route buttons, and the back button while keeping the `1/2/3` keyboard shortcut path and compact hidden-panel sync.
- Modify: `src/styles/css/level-select.details.responsive.css`
  Responsibility: restore the narrow-screen compact card geometry so the mobile selector uses one visible panel with a bounded page height.
- Modify: `src/styles/css/level-select.polish.css`
  Responsibility: ensure hidden compact panels are truly removed from layout and remove the elevated hover/active card treatment that no longer fits the compact route contract.
- Modify: `tests/level-select-interactions.spec.js`
  Responsibility: drive the CTA path with real browser clicks instead of synthetic `pointerdown` dispatches so the spec matches keyboard/button semantics.
- Verify Only: `tests/level-select-polish.spec.js`
  Responsibility: prove compact mobile selector visibility, keyboard route switching, and button-in-card layout all recover.
- Verify Only: `tests/level-select-scoreboard.spec.js`
  Responsibility: prove the scoreboard/progress UI still renders after the CSS recovery.

## Out Of Scope

- Changing level names, storage keys, or scoreboard data shape.
- Editing `src/scripts/level-select-page.progress.js`.
- Folding Evan helper, manager modal, worm reward, install prompt, or perf fixes into this branch.
- Redesigning the level-select page beyond what is necessary to recover the existing compact route contract.

### Task 1: Lock The Real Browser Interaction Contract

**Files:**
- Modify: `tests/level-select-interactions.spec.js`
- Verify Only: `src/pages/level-select.html`

- [ ] **Step 1: Replace synthetic CTA activation with real button clicks in the interaction spec**

```javascript
// tests/level-select-interactions.spec.js
for (const route of ROUTES) {
  test(`launches ${route.level} only from its CTA button`, async ({ page }) => {
    await useDesktopViewport(page);
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);
    await switchCompactRouteIfNeeded(page, route.level);

    const button = page.locator(
      `.level-card[data-level="${route.level}"] .level-button`,
    );

    await button.scrollIntoViewIfNeeded();
    await button.click({ noWaitAfter: true });
    await expectRouteLaunch(page, route.level);
  });
}

test("keeps CTA launch working with reduced motion enabled", async ({
  page,
}) => {
  await useDesktopViewport(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

  await page
    .getByRole("button", { name: "Enter foundations" })
    .click({ noWaitAfter: true });
  await expectRouteLaunch(page, "beginner");
});
```

- [ ] **Step 2: Run the interaction spec and verify it is red for the current merge regression**

Run: `npx playwright test tests/level-select-interactions.spec.js --reporter=line`
Expected: FAIL on `launches a focused CTA button with Enter`, `switches compact routes with keyboard activation`, `returns to welcome from the back button with Enter`, and any CTA case still wired only to `pointerdown`.

- [ ] **Step 3: Confirm the page markup does not need edits before touching runtime code**

```html
<!-- src/pages/level-select.html -->
<div class="route-switcher" aria-label="Choose route preview">
  <button class="route-switcher-button is-active" type="button" data-level="beginner" aria-pressed="true"
      aria-controls="level-panel-beginner">
      <span class="route-switcher-index">01</span>
      <span class="route-switcher-copy">Foundations</span>
  </button>
  <button class="route-switcher-button" type="button" data-level="warrior" aria-pressed="false"
      aria-controls="level-panel-warrior">
      <span class="route-switcher-index">02</span>
      <span class="route-switcher-copy">Mixed Ops</span>
  </button>
  <button class="route-switcher-button" type="button" data-level="master" aria-pressed="false"
      aria-controls="level-panel-master">
      <span class="route-switcher-index">03</span>
      <span class="route-switcher-copy">Division</span>
  </button>
</div>
```

- [ ] **Step 4: Do not commit yet; keep the updated spec red and move straight into the runtime fix**

```bash
git status --short tests/level-select-interactions.spec.js src/scripts/level-select-page.interactions.js
```

Expected: only the interaction spec is dirty at this point.

### Task 2: Restore Click Semantics In The Runtime Interaction Layer

**Files:**
- Modify: `src/scripts/level-select-page.interactions.js`
- Modify: `tests/level-select-interactions.spec.js`

- [ ] **Step 1: Switch CTA, route-switcher, and back-button handlers from `pointerdown` to `click`**

```javascript
// src/scripts/level-select-page.interactions.js
function attachLevelHandlers() {
  elements.levelButtons.forEach((button) => {
    const levelKey = button.dataset.level || "beginner";
    const handler = (event) => {
      selectLevel(levelKey, button, event);
    };

    state.levelHandlers.set(button, handler);
    button.addEventListener("click", handler);
  });
}

function attachRouteHandlers() {
  elements.routeButtons.forEach((button) => {
    const levelKey = button.dataset.level || "beginner";
    const handler = () => {
      setActiveLevel(levelKey);
    };

    state.routeHandlers.set(button, handler);
    button.addEventListener("click", handler);
  });
}

function detachHandlers() {
  state.levelHandlers.forEach((handler, button) => {
    button.removeEventListener("click", handler);
  });
  state.routeHandlers.forEach((handler, button) => {
    button.removeEventListener("click", handler);
  });
  state.levelHandlers.clear();
  state.routeHandlers.clear();
}

function initInteractions() {
  document.addEventListener("keydown", handleKeydown);
  compactMedia.addEventListener("change", syncCompactLayout);

  attachLevelHandlers();
  attachRouteHandlers();
  syncCompactLayout();

  if (elements.backButton) {
    elements.backButton.addEventListener("click", goBack);
  }
}

function destroyInteractions() {
  document.removeEventListener("keydown", handleKeydown);
  compactMedia.removeEventListener("change", syncCompactLayout);

  detachHandlers();

  if (elements.backButton) {
    elements.backButton.removeEventListener("click", goBack);
  }
}
```

- [ ] **Step 2: Keep the existing keyboard shortcut path untouched so `1`, `2`, and `3` still launch directly**

```javascript
// src/scripts/level-select-page.interactions.js
function handleKeydown(event) {
  const selectedCard = (() => {
    switch (event.key) {
      case "1":
        return elements.cards[0];
      case "2":
        return elements.cards[1];
      case "3":
        return elements.cards[2];
      default:
        return null;
    }
  })();

  if (selectedCard) {
    const levelKey = selectedCard.dataset.level || "beginner";
    const button = selectedCard.querySelector(".level-button");
    setActiveLevel(levelKey);
    if (button instanceof HTMLElement) {
      selectLevel(levelKey, button, event);
    }
    return;
  }

  if (event.key === "Escape" || event.key === "Backspace") {
    if (event.key === "Backspace") {
      event.preventDefault();
    }
    goBack(event);
  }
}
```

- [ ] **Step 3: Re-run the interaction spec and verify it is green**

Run: `npx playwright test tests/level-select-interactions.spec.js --reporter=line`
Expected: PASS. `Enter` on the focused CTA should navigate, `Space` on the compact route button should flip `aria-pressed`, and `Enter` on the back button should return to `/src/pages/index.html`.

- [ ] **Step 4: Commit the interaction recovery once the lane is green**

```bash
git add tests/level-select-interactions.spec.js src/scripts/level-select-page.interactions.js
git commit -m "fix: restore level-select click interactions"
```

### Task 3: Recover The Compact Mobile Layout

**Files:**
- Modify: `src/styles/css/level-select.details.responsive.css`
- Modify: `src/styles/css/level-select.polish.css`
- Verify Only: `tests/level-select-polish.spec.js`
- Verify Only: `tests/level-select-scoreboard.spec.js`

- [ ] **Step 1: Restore the compact mobile card geometry in the responsive stylesheet**

```css
/* src/styles/css/level-select.details.responsive.css */
@media (max-width: 768px) {
  .header {
    padding: 1.15rem 1rem 0;
    gap: 0.45rem;
  }

  .main-title {
    font-size: clamp(2.4rem, 11vw, 4rem);
    letter-spacing: 0.16em;
  }

  .level-container {
    padding: 0.85rem 1rem 1.25rem;
  }

  .route-switcher {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
    margin-bottom: 0.8rem;
  }

  .level-card {
    grid-template-columns: minmax(0, 1.1fr) minmax(9rem, 0.9fr);
    grid-template-areas:
      "ordinal icon"
      "title icon"
      "description stats"
      "progress progress"
      "button button";
    padding: 1rem;
    gap: 0.7rem 0.85rem;
    min-height: auto;
  }

  .level-ordinal {
    grid-area: ordinal;
  }

  .level-icon {
    grid-area: icon;
    justify-self: end;
    width: 2.85rem;
    height: 2.85rem;
  }

  .level-title {
    grid-area: title;
    font-size: clamp(1.35rem, 4.8vw, 1.7rem);
  }

  .level-description {
    grid-area: description;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .level-stats {
    grid-area: stats;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    align-self: start;
  }

  .progress-container {
    grid-area: progress;
    gap: 0.35rem;
  }

  .level-button {
    grid-area: button;
    min-height: 2.8rem;
    padding: 0.8rem 1rem;
    font-size: 0.68rem;
    letter-spacing: 0.18em;
  }
}

@media (max-width: 480px) {
  .level-card {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "ordinal"
      "icon"
      "title"
      "description"
      "stats"
      "progress"
      "button";
    gap: 0.65rem;
    padding: 0.9rem;
  }

  .level-icon {
    justify-self: start;
  }

  .level-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

- [ ] **Step 2: Make hidden compact panels leave layout entirely and neutralize the old elevated card treatment**

```css
/* src/styles/css/level-select.polish.css */
.level-card[hidden] {
  display: none !important;
}

.level-card:hover {
  border-color: var(--level-panel-border);
  box-shadow:
    var(--level-panel-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.level-card.is-active {
  border-color: var(--level-panel-border);
  box-shadow:
    var(--level-panel-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
```

- [ ] **Step 3: Run the polish lane and verify the compact selector contract is green**

Run: `npx playwright test tests/level-select-polish.spec.js --reporter=line`
Expected: PASS. Narrow mobile should show exactly one visible card, the page-height delta should stay under the existing threshold, and keyboard activation should switch the visible panel.

- [ ] **Step 4: Run the scoreboard lane to prove the CSS recovery did not break progress rendering**

Run: `npx playwright test tests/level-select-scoreboard.spec.js --reporter=line`
Expected: PASS. The completion, best-score, and total-score stats should still render inside the level cards.

- [ ] **Step 5: Commit the compact layout recovery**

```bash
git add src/styles/css/level-select.details.responsive.css src/styles/css/level-select.polish.css
git commit -m "fix: recover compact level-select mobile layout"
```

### Task 4: Run Repo Validation And Compare Against The Known-Good Branch

**Files:**
- Verify Only: `src/scripts/level-select-page.interactions.js`
- Verify Only: `src/styles/css/level-select.details.responsive.css`
- Verify Only: `src/styles/css/level-select.polish.css`
- Verify Only: `tests/level-select-interactions.spec.js`
- Verify Only: `tests/level-select-polish.spec.js`
- Verify Only: `tests/level-select-scoreboard.spec.js`

- [ ] **Step 1: Run the full focused level-select regression lane from the repo root**

Run: `npx playwright test tests/level-select-interactions.spec.js tests/level-select-polish.spec.js tests/level-select-scoreboard.spec.js --reporter=line`
Expected: PASS.

- [ ] **Step 2: Run the repo validation baseline required by the project docs**

Run: `npm run verify`
Expected: PASS.

- [ ] **Step 3: Run the type checker before declaring the recovery complete**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Compare the three recovered source files against the local working reference branch to catch drift**

```bash
git diff --stat merge/main-2026-04-08..feature/level-select-compact-route-followup -- \
  src/scripts/level-select-page.interactions.js \
  src/styles/css/level-select.details.responsive.css \
  src/styles/css/level-select.polish.css \
  tests/level-select-interactions.spec.js
```

Expected: either no diff or only intentional cleanup differences you can explain in the final review.

- [ ] **Step 5: Confirm the branch is clean and the two recovery commits are the only new work**

```bash
git status --short
git log --oneline -3
```

Expected: a clean working tree, two focused recovery commits, and no extra level-select files beyond the four-file port.