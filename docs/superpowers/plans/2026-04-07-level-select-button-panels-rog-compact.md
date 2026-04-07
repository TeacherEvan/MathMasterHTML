# Level Select Button Panels ROG Compact Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the level-select page so each route launches only from an explicit button inside the panel, while mobile uses a compact selector-driven layout that removes the need to scroll through three oversized stacked panels.

**Architecture:** Keep the existing browser-native level-select runtime split between page markup, interaction logic, and CSS, but change the interaction contract from full-card activation to button-gated activation. On desktop, keep all three route panels visible with stronger ROG-style framing and explicit CTAs. On narrow screens, introduce a route switcher that shows one active panel at a time so players compare routes without vertical page scroll.

**Tech Stack:** Browser-native HTML/CSS/JavaScript with `window.*` globals, existing level-select split files, localStorage-backed progress UI, and Playwright tests.

---

## File Structure

- Modify: `src/pages/level-select.html`
  Responsibility: add compact route-switcher controls and give each panel/button stable attributes for button-only launch and mobile active-state toggling.
- Modify: `src/scripts/level-select-page.interactions.js`
  Responsibility: remove full-card click behavior, bind launch only to `.level-button`, preserve keyboard shortcuts, and manage compact-mode route switching.
- Modify: `src/styles/css/level-select.polish.css`
  Responsibility: shift panel styling away from full-card button affordances, add more angular ROG-inspired framing, and strengthen the explicit CTA button treatment.
- Modify: `src/styles/css/level-select.details.responsive.css`
  Responsibility: replace the current stacked-card mobile layout with a compact route switcher plus one-visible-panel presentation.
- Modify: `tests/level-select-interactions.spec.js`
  Responsibility: assert that panel body clicks do not launch a route while CTA buttons and keyboard shortcuts still do.
- Modify: `tests/level-select-polish.spec.js`
  Responsibility: assert the compact mobile selector layout, the one-visible-panel rule, and that CTA buttons remain fully inside each panel.
- Verify Only: `tests/level-select-scoreboard.spec.js`
  Responsibility: ensure progress/stat rendering still works after the layout and markup changes.

## Design Constraints

- Keep the real runtime page in `src/pages/level-select.html`; do not edit the root redirect page.
- Preserve the split-file browser runtime and `window.LevelSelectPage.*` exports.
- Prefer `pointerdown` on actionable controls.
- Do not make the entire panel appear interactive after the change; the CTA button must be the clear launch affordance.
- Use compact selection on mobile instead of forcing players to scroll through three full panels.

## Out Of Scope

- Changing level names, problem counts, or local-storage data shape.
- Reworking matrix background effects or progress-bar animation timing.
- Introducing frameworks, modules, or new build steps.

### Task 1: Lock The Button-Only Interaction Contract In Playwright

**Files:**
- Modify: `tests/level-select-interactions.spec.js`

- [ ] **Step 1: Rewrite the interaction spec so it fails against the current full-card behavior**

```javascript
// tests/level-select-interactions.spec.js
// @ts-check
import { expect, test } from "@playwright/test";

const LEVEL_SELECT_URL = "/src/pages/level-select.html";
const ROUTES = [
  { key: "1", level: "beginner", buttonName: "Enter foundations" },
  { key: "2", level: "warrior", buttonName: "Enter mixed ops" },
  { key: "3", level: "master", buttonName: "Enter division" },
];

async function waitForCardsToSettle(page) {
  await page.waitForFunction(() => {
    const cards = Array.from(document.querySelectorAll(".level-card"));
    if (cards.length !== 3) return false;

    return cards.every((card) => {
      const style = window.getComputedStyle(card);
      const opacity = Number.parseFloat(style.opacity || "1");
      const transform = style.transform;

      return (
        opacity >= 0.99 &&
        (transform === "none" ||
          /^matrix\(1, 0, 0, 1, 0(?:\.0+)?, 0(?:\.0+)?\)$/.test(transform))
      );
    });
  });
}

async function expectRouteLaunch(page, level) {
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}?level=${url.searchParams.get("level") || ""}`;
    })
    .toBe(`/src/pages/game.html?level=${level}`);
}

test.describe("Level select interactions", () => {
  test("does not launch a route when the panel body is clicked", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await waitForCardsToSettle(page);

    await page
      .locator('.level-card[data-level="beginner"] .level-description')
      .click();

    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/src\/pages\/level-select\.html(?:$|\?)/);
  });

  for (const route of ROUTES) {
    test(`launches ${route.level} only from its CTA button`, async ({ page }) => {
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);

      await page
        .getByRole("button", { name: route.buttonName })
        .click({ force: true, noWaitAfter: true });

      await expectRouteLaunch(page, route.level);
    });

    test(`launches ${route.level} from keyboard shortcut ${route.key}`, async ({
      page,
    }) => {
      await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
      await waitForCardsToSettle(page);
      await page.keyboard.press(route.key);
      await expectRouteLaunch(page, route.level);
    });
  }

  test("keeps CTA launch working with reduced motion enabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await page.waitForFunction(() => {
      const cards = Array.from(document.querySelectorAll(".level-card"));
      const progressBars = Array.from(document.querySelectorAll(".progress-fill"));

      return (
        cards.length === 3 &&
        progressBars.length === 3 &&
        cards.every((card) => {
          const style = window.getComputedStyle(card);
          return style.opacity === "1" && style.transform === "none";
        }) &&
        progressBars.every((bar) => bar.style.transition === "none")
      );
    });

    await page
      .getByRole("button", { name: "Enter foundations" })
      .click({ force: true, noWaitAfter: true });
    await expectRouteLaunch(page, "beginner");
  });
});
```

- [ ] **Step 2: Run the focused interaction lane and confirm the new body-click test fails first**

Run: `npx playwright test tests/level-select-interactions.spec.js --reporter=line`
Expected: FAIL because clicking `.level-description` still bubbles to the `.level-card` click handler and navigates to the game page.

- [ ] **Step 3: Keep helper names stable and remove any wording that still describes whole-card launching**

```javascript
// tests/level-select-interactions.spec.js
test.describe("Level select interactions", () => {
  test("does not launch a route when the panel body is clicked", async ({ page }) => {
    // Panel body is informational only; launch must come from the explicit CTA.
  });

  test("launches beginner only from its CTA button", async ({ page }) => {
    // Keep this button-driven wording consistent with the approved interaction model.
  });
});
```

- [ ] **Step 4: Re-run the focused interaction lane to make sure the failures are still only about the runtime behavior**

Run: `npx playwright test tests/level-select-interactions.spec.js --reporter=line`
Expected: FAIL with route-launch mismatches caused by the existing full-card event binding, not with missing selectors or unrelated preload errors.

- [ ] **Step 5: Commit**

```bash
git add tests/level-select-interactions.spec.js
git commit -m "test: define level select button-only launch behavior"
```

### Task 2: Lock The Compact Mobile Layout Contract In Playwright

**Files:**
- Modify: `tests/level-select-polish.spec.js`

- [ ] **Step 1: Replace the stacked-mobile assertion with a compact selector-driven assertion**

```javascript
// tests/level-select-polish.spec.js
test("uses a compact route selector instead of stacked scrolling cards on narrow mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/src/pages/level-select.html", {
    waitUntil: "domcontentloaded",
  });

  await waitForCardsToSettle(page);

  const switcher = page.locator(".route-switcher");
  const switcherButtons = switcher.locator(".route-switcher-button");
  const cards = page.locator(".level-card");
  const activeCard = page.locator('.level-card:not([hidden])');
  const activeButton = activeCard.locator(".level-button");

  await expect(switcher).toBeVisible();
  await expect(switcherButtons).toHaveCount(3);
  await expect(cards.filter({ hasNot: page.locator("[hidden]") })).toHaveCount(1);

  const [docHeight, viewportHeight, activeCardBox, activeButtonBox] = await Promise.all([
    page.evaluate(() => document.documentElement.scrollHeight),
    page.evaluate(() => window.innerHeight),
    activeCard.boundingBox(),
    activeButton.boundingBox(),
  ]);

  expect(docHeight - viewportHeight).toBeLessThanOrEqual(180);
  expect(activeCardBox).toBeTruthy();
  expect(activeButtonBox).toBeTruthy();
  expect(activeButtonBox.y + activeButtonBox.height).toBeLessThanOrEqual(
    activeCardBox.y + activeCardBox.height + 1,
  );
});

test("switches the visible route panel when a compact selector button is pressed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/src/pages/level-select.html", {
    waitUntil: "domcontentloaded",
  });

  await waitForCardsToSettle(page);

  await page
    .locator('.route-switcher-button[data-level="warrior"]')
    .click();

  await expect(
    page.locator('.route-switcher-button[data-level="warrior"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.level-card[data-level="warrior"]')).toBeVisible();
  await expect(page.locator('.level-card[data-level="beginner"]')).toBeHidden();
});
```

- [ ] **Step 2: Run the focused polish lane and confirm it fails because the switcher does not exist yet**

Run: `npx playwright test tests/level-select-polish.spec.js --reporter=line`
Expected: FAIL on missing `.route-switcher` markup and on the current stacked-card mobile layout.

- [ ] **Step 3: Keep the desktop readability test, but tighten the mobile language so it matches the approved design**

```javascript
// tests/level-select-polish.spec.js
test.describe("Level select polish", () => {
  test("keeps the hero and route cards visually readable after polish", async ({ page }) => {
    // Desktop still shows all route panels at once.
  });

  test("uses a compact route selector instead of stacked scrolling cards on narrow mobile", async ({
    page,
  }) => {
    // Mobile shows one active route panel at a time.
  });
});
```

- [ ] **Step 4: Re-run the polish lane and confirm only the not-yet-implemented layout behavior is failing**

Run: `npx playwright test tests/level-select-polish.spec.js --reporter=line`
Expected: FAIL with missing switcher / visibility assertions, not with desktop header or progress-stat regressions.

- [ ] **Step 5: Commit**

```bash
git add tests/level-select-polish.spec.js
git commit -m "test: define compact mobile level select layout"
```

### Task 3: Update The Level Select Markup And Interaction Logic

**Files:**
- Modify: `src/pages/level-select.html`
- Modify: `src/scripts/level-select-page.interactions.js`

- [ ] **Step 1: Add a compact route switcher above the card grid and give each panel a stable panel id**

```html
<!-- src/pages/level-select.html -->
<div class="level-container">
    <div class="route-switcher" aria-label="Choose route preview">
        <button class="route-switcher-button" type="button" data-level="beginner" aria-pressed="true">
            <span class="route-switcher-index">01</span>
            <span class="route-switcher-copy">Foundations</span>
        </button>
        <button class="route-switcher-button" type="button" data-level="warrior" aria-pressed="false">
            <span class="route-switcher-index">02</span>
            <span class="route-switcher-copy">Mixed Ops</span>
        </button>
        <button class="route-switcher-button" type="button" data-level="master" aria-pressed="false">
            <span class="route-switcher-index">03</span>
            <span class="route-switcher-copy">Division</span>
        </button>
    </div>

    <div class="levels-grid">
        <div class="level-card level-easy" id="level-panel-beginner" data-level="beginner">
            ...
            <button class="level-button" type="button" data-level="beginner">Enter foundations</button>
        </div>

        <div class="level-card level-medium" id="level-panel-warrior" data-level="warrior">
            ...
            <button class="level-button" type="button" data-level="warrior">Enter mixed ops</button>
        </div>

        <div class="level-card level-hard" id="level-panel-master" data-level="master">
            ...
            <button class="level-button" type="button" data-level="master">Enter division</button>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Replace the full-card event binding with button-only launch and compact-mode active-panel syncing**

```javascript
// src/scripts/level-select-page.interactions.js
(function () {
  "use strict";

  const CONFIG = Object.freeze({
    RIPPLE: {
      SIZE_PX: 60,
      REMOVE_DELAY_MS: 600,
    },
    NAVIGATION: {
      LEVEL_SELECT: "/src/pages/game.html?level=",
      BACK: "/src/pages/index.html",
    },
    COMPACT_BREAKPOINT: "(max-width: 768px)",
  });

  const elements = {
    backButton: document.querySelector(".back-button"),
    cards: Array.from(document.querySelectorAll(".level-card")),
    levelButtons: Array.from(document.querySelectorAll(".level-button")),
    routeButtons: Array.from(document.querySelectorAll(".route-switcher-button")),
  };

  const compactMedia = window.matchMedia(CONFIG.COMPACT_BREAKPOINT);
  const state = {
    activeLevel: elements.cards[0]?.dataset.level || "beginner",
    levelHandlers: new Map(),
    routeHandlers: new Map(),
  };

  function createRipple(event, target) {
    const ripple = document.createElement("div");
    ripple.className = "ripple";

    const rect = target.getBoundingClientRect();
    const size = CONFIG.RIPPLE.SIZE_PX;
    const hasPointerPosition =
      typeof event.clientX === "number" && typeof event.clientY === "number";
    const x = hasPointerPosition
      ? event.clientX - rect.left - size / 2
      : rect.width / 2 - size / 2;
    const y = hasPointerPosition
      ? event.clientY - rect.top - size / 2
      : rect.height / 2 - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    target.appendChild(ripple);

    setTimeout(() => {
      if (target.contains(ripple)) {
        target.removeChild(ripple);
      }
    }, CONFIG.RIPPLE.REMOVE_DELAY_MS);
  }

  function syncCompactLayout() {
    const compactMode = compactMedia.matches;

    elements.cards.forEach((card) => {
      const isActive = card.dataset.level === state.activeLevel;
      card.classList.toggle("is-active", isActive);
      card.hidden = compactMode ? !isActive : false;
    });

    elements.routeButtons.forEach((button) => {
      const isActive = button.dataset.level === state.activeLevel;
      button.setAttribute("aria-pressed", String(isActive));
      button.classList.toggle("is-active", isActive);
    });
  }

  function setActiveLevel(levelKey) {
    state.activeLevel = levelKey;
    syncCompactLayout();
  }

  function selectLevel(levelKey, triggerElement, interactionEvent) {
    if (interactionEvent) {
      createRipple(interactionEvent, triggerElement);
    }

    triggerElement.style.transform = "scale(0.98)";
    setTimeout(() => {
      triggerElement.style.transform = "";
    }, 180);

    setTimeout(() => {
      window.location.href = `${CONFIG.NAVIGATION.LEVEL_SELECT}${levelKey}`;
    }, 300);
  }

  function attachLevelHandlers() {
    elements.levelButtons.forEach((button) => {
      const levelKey = button.dataset.level || "beginner";
      const handler = (event) => {
        selectLevel(levelKey, button, event);
      };

      state.levelHandlers.set(button, handler);
      button.addEventListener("pointerdown", handler);
    });
  }

  function attachRouteHandlers() {
    elements.routeButtons.forEach((button) => {
      const levelKey = button.dataset.level || "beginner";
      const handler = () => {
        setActiveLevel(levelKey);
      };

      state.routeHandlers.set(button, handler);
      button.addEventListener("pointerdown", handler);
    });
  }

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

  function goBack(interactionEvent) {
    const rippleTarget =
      interactionEvent?.currentTarget ||
      interactionEvent?.target?.closest?.("button") ||
      elements.backButton;

    if (rippleTarget) {
      createRipple(interactionEvent || {}, rippleTarget);
    }

    setTimeout(() => {
      window.location.href = CONFIG.NAVIGATION.BACK;
    }, 300);
  }

  function initInteractions() {
    document.addEventListener("keydown", handleKeydown);
    compactMedia.addEventListener("change", syncCompactLayout);
    attachLevelHandlers();
    attachRouteHandlers();
    syncCompactLayout();

    if (elements.backButton) {
      elements.backButton.addEventListener("pointerdown", goBack);
    }
  }

  function destroyInteractions() {
    document.removeEventListener("keydown", handleKeydown);
    compactMedia.removeEventListener("change", syncCompactLayout);

    state.levelHandlers.forEach((handler, button) => {
      button.removeEventListener("pointerdown", handler);
    });
    state.routeHandlers.forEach((handler, button) => {
      button.removeEventListener("pointerdown", handler);
    });
    state.levelHandlers.clear();
    state.routeHandlers.clear();

    if (elements.backButton) {
      elements.backButton.removeEventListener("pointerdown", goBack);
    }
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initInteractions = initInteractions;
  window.LevelSelectPage.destroyInteractions = destroyInteractions;
})();
```

- [ ] **Step 3: Run just the interaction spec and fix any selector or event-model mistakes before touching CSS**

Run: `npx playwright test tests/level-select-interactions.spec.js --reporter=line`
Expected: PASS. The body-click test should stay on level select, the CTA tests should navigate, and keyboard `1/2/3` should still launch the right route.

- [ ] **Step 4: Run the polish spec and confirm the only remaining failures are the new compact-layout assertions**

Run: `npx playwright test tests/level-select-polish.spec.js --reporter=line`
Expected: FAIL because the switcher and active-panel behavior now exist in markup/JS, but the CSS still renders the old stacked mobile layout.

- [ ] **Step 5: Commit**

```bash
git add src/pages/level-select.html src/scripts/level-select-page.interactions.js
git commit -m "feat: add button-gated route selection controls"
```

### Task 4: Apply The ROG-Inspired Panel Styling And Compact Mobile Layout

**Files:**
- Modify: `src/styles/css/level-select.polish.css`
- Modify: `src/styles/css/level-select.details.responsive.css`

- [ ] **Step 1: Remove full-card button affordances and add harder-edged panel framing plus a visible switcher control style**

```css
/* src/styles/css/level-select.polish.css */
:root {
  --level-panel-radius: 24px;
  --level-panel-cut: 18px;
  --level-switcher-bg: rgba(255, 255, 255, 0.04);
}

.route-switcher {
  display: none;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.route-switcher-button {
  display: inline-grid;
  gap: 0.18rem;
  justify-items: start;
  min-height: 3.4rem;
  padding: 0.8rem 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, var(--level-switcher-bg), rgba(255, 255, 255, 0.02));
  color: var(--level-text-1);
  font-family: var(--level-font-mono);
  text-transform: uppercase;
}

.route-switcher-button.is-active,
.route-switcher-button[aria-pressed="true"] {
  border-color: var(--level-phosphor);
  color: var(--level-text-0);
  box-shadow: 0 0 0 1px rgba(142, 203, 117, 0.14), 0 16px 30px rgba(0, 0, 0, 0.28);
}

.route-switcher-index {
  font-size: 0.68rem;
  letter-spacing: 0.22em;
}

.route-switcher-copy {
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.level-card {
  border-radius: var(--level-panel-radius);
  cursor: default;
  clip-path: polygon(
    0 0,
    calc(100% - var(--level-panel-cut)) 0,
    100% var(--level-panel-cut),
    100% 100%,
    0 100%
  );
}

.level-card:hover {
  transform: none;
}

.level-card::before {
  height: 3px;
  opacity: 1;
}

.level-button {
  min-height: 3.2rem;
  letter-spacing: 0.24em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.level-button:hover,
.level-button:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px color-mix(in srgb, var(--level-accent) 16%, transparent);
}
```

- [ ] **Step 2: Replace the current narrow-screen stacking rules with a one-panel compact mode**

```css
/* src/styles/css/level-select.details.responsive.css */
@media (max-width: 768px) {
  .header {
    padding: 1.5rem 1rem 0;
    gap: 0.55rem;
  }

  .level-container {
    padding: 1rem 1rem 1.5rem;
  }

  .route-switcher {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .levels-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .level-card {
    padding: 1.1rem;
    gap: 0.8rem;
    min-height: auto;
  }

  .level-title {
    font-size: clamp(1.45rem, 5vw, 1.85rem);
  }

  .level-description {
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .level-stats {
    gap: 0.55rem;
  }

  .stat {
    padding: 0.7rem 0.72rem;
  }
}

@media (max-width: 480px) {
  .route-switcher {
    gap: 0.45rem;
  }

  .route-switcher-button {
    min-height: 3rem;
    padding: 0.72rem 0.7rem;
  }

  .route-switcher-copy {
    font-size: 0.72rem;
  }

  .navigation {
    padding: 0 1rem 2rem;
  }
}
```

- [ ] **Step 3: Run the focused level-select suite and verify all behavior-specific coverage passes**

Run: `npx playwright test tests/level-select-interactions.spec.js tests/level-select-polish.spec.js tests/level-select-scoreboard.spec.js --reporter=line`
Expected: PASS. The interaction contract, compact mobile layout, and scoreboard stats should all pass together.

- [ ] **Step 4: Run repo-required verification for this runtime change**

Run: `npm run verify`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/css/level-select.polish.css src/styles/css/level-select.details.responsive.css
git commit -m "feat: compact level select layout and rog panel polish"
```

### Task 5: Manual Sanity Check The Actual Route Flow

**Files:**
- Verify only: `src/pages/level-select.html`

- [ ] **Step 1: Start the local server if it is not already running**

Run: `npm start`
Expected: Local server starts without `file://` usage and serves the runtime pages over HTTP.

- [ ] **Step 2: Verify desktop route selection manually in the browser**

Run: `xdg-open http://localhost:8000/src/pages/level-select.html`
Expected: All three route panels are visible, only the inner CTA launches a route, keyboard `1/2/3` still works, and clicking description/stats text does nothing.

- [ ] **Step 3: Verify narrow-mobile behavior manually with browser responsive mode**

```text
Viewport: 430 x 932
Check: route switcher is visible above the card area
Check: only one route panel is visible at a time
Check: switching routes does not require vertical scrolling through three full cards
Check: the CTA button remains fully visible inside the active route panel
```

- [ ] **Step 4: Record any discrepancies immediately before moving on**

```text
If manual QA finds a mismatch, update the relevant Playwright spec first, then fix the runtime.
Do not leave a manual-only adjustment unreflected in tests.
```

- [ ] **Step 5: Commit**

```bash
git add tests/level-select-interactions.spec.js tests/level-select-polish.spec.js src/pages/level-select.html src/scripts/level-select-page.interactions.js src/styles/css/level-select.polish.css src/styles/css/level-select.details.responsive.css
git commit -m "chore: verify level select button panels manually"
```

## Self-Review

- Spec coverage: the plan covers button-only route launch, explicit panel CTAs, a tighter ROG-style presentation, mobile no-scroll route switching, and the needed Playwright updates.
- Placeholder scan: no `TODO`, `TBD`, or deferred “write tests later” steps remain.
- Type consistency: the same selectors and names are used throughout the plan: `.route-switcher`, `.route-switcher-button`, `.level-card`, `.level-button`, and `data-level` values `beginner`, `warrior`, `master`.