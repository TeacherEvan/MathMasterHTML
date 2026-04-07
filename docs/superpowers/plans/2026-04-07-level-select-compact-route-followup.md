# Level Select Compact Route Follow-up Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the active uncommitted level-select follow-up patch into a clean, validated branch that preserves the compact route selector, button-only route launches, and the updated mobile polish.

**Architecture:** Keep the current split between page markup, interaction logic, stylesheet imports, and Playwright surface tests. The follow-up branch should preserve three core contracts: explicit CTA buttons launch a route, narrow screens show one route card at a time through a compact selector, and the polished desktop/mobile layout still keeps buttons, progress, and score affordances readable.

**Tech Stack:** Browser-native HTML/CSS/JavaScript, imported stylesheet hub, Playwright, and TypeScript typecheck.

---

## File Structure

- Modify: `src/pages/level-select.html`
  Responsibility: add compact route-switcher controls, stable `id`/`aria-controls` pairing, and `data-level` attributes on CTA buttons.
- Modify: `src/scripts/level-select-page.interactions.js`
  Responsibility: switch route launching to CTA buttons only, keep keyboard shortcuts, and synchronize the compact one-visible-panel layout.
- Modify: `src/styles/css/level-select.css`
  Responsibility: import the responsive detail stylesheet so the compact layout rules are loaded through the stable CSS hub.
- Modify: `src/styles/css/level-select.details.responsive.css`
  Responsibility: tighten the mobile route-switcher spacing and compact card sizing at `768px` and below.
- Modify: `src/styles/css/level-select.polish.css`
  Responsibility: style the compact route switcher, active panel states, and CTA affordances without reintroducing full-card click affordance.
- Modify: `tests/level-select-interactions.spec.js`
  Responsibility: assert body-click safety, CTA-only launch, keyboard shortcuts, and reduced-motion compatibility.
- Modify: `tests/level-select-polish.spec.js`
  Responsibility: assert compact mobile selector behavior and panel/button layout integrity.
- Verify Only: `tests/level-select-scoreboard.spec.js`
  Responsibility: prove the local progress UI still renders after the layout follow-up.

## Design Constraints

- Keep the runtime page in `src/pages/level-select.html`.
- Preserve the browser-native `window.LevelSelectPage.*` exports.
- Prefer `pointerdown` on actionable controls.
- Do not restore full-card route launching.
- Keep the compact selector behavior limited to narrow breakpoints.

## Out Of Scope

- Renaming routes or changing progress storage keys.
- Reworking matrix background effects.
- Folding this branch into cleanup or console follow-up work.

### Task 1: Lock The Current Follow-up Contract In Playwright

**Files:**
- Modify: `tests/level-select-interactions.spec.js`
- Modify: `tests/level-select-polish.spec.js`
- Verify Only: `tests/level-select-scoreboard.spec.js`

- [ ] **Step 1: Make the interaction spec match the current button-only launch contract**

```javascript
// tests/level-select-interactions.spec.js
const DESKTOP_VIEWPORT = { width: 1440, height: 1100 };

async function useDesktopViewport(page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
}

async function clickCardBody(page, level) {
  const card = page.locator(`.level-card[data-level="${level}"]`);
  const ctaButton = card.locator(".level-button");

  await card.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });

  const [cardBox, buttonBox] = await Promise.all([
    card.boundingBox(),
    ctaButton.boundingBox(),
  ]);

  const buttonTopWithinCard = buttonBox.y - cardBox.y;
  const clickY = Math.max(
    24,
    Math.min(buttonTopWithinCard - 24, Math.round(buttonTopWithinCard * 0.5)),
  );

  await page.mouse.click(
    Math.round(cardBox.x + cardBox.width / 2),
    Math.round(cardBox.y + clickY),
  );
}

test("does not launch a route when the panel body is clicked", async ({ page }) => {
  await useDesktopViewport(page);
  await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
  await waitForCardsToSettle(page);

  await clickCardBody(page, "beginner");
  await expect(page).toHaveURL(/\/src\/pages\/level-select\.html(?:$|\?)/);
});

test("keeps CTA launch working with reduced motion enabled", async ({ page }) => {
  await useDesktopViewport(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

  await page
    .getByRole("button", { name: "Enter foundations" })
    .dispatchEvent("pointerdown");
  await expectRouteLaunch(page, "beginner");
});
```

- [ ] **Step 2: Make the polish spec match the compact selector contract**

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
  const activeCard = page.locator('.level-card[data-level="beginner"]');
  const activeButton = activeCard.locator(".level-button");

  await expect(switcher).toBeVisible();
  await expect(switcherButtons).toHaveCount(3);

  const [visibleLevels, docHeight, viewportHeight] = await Promise.all([
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".level-card"))
        .filter((card) => !card.hidden)
        .map((card) => card.dataset.level),
    ),
    page.evaluate(() => document.documentElement.scrollHeight),
    page.evaluate(() => window.innerHeight),
  ]);

  expect(visibleLevels).toEqual(["beginner"]);
  expect(docHeight - viewportHeight).toBeLessThanOrEqual(180);
  await expect(activeButton).toBeVisible();
});

test("switches the visible route panel when a compact selector button is pressed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/src/pages/level-select.html", {
    waitUntil: "domcontentloaded",
  });

  await waitForCardsToSettle(page);
  await page.locator('.route-switcher-button[data-level="warrior"]').click();

  await expect(
    page.locator('.route-switcher-button[data-level="warrior"]'),
  ).toHaveAttribute("aria-pressed", "true");
});
```

- [ ] **Step 3: Run the focused level-select lane before changing any runtime code**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels && npx playwright test tests/level-select-interactions.spec.js tests/level-select-polish.spec.js tests/level-select-scoreboard.spec.js --reporter=line`
Expected: PASS on the current dirty branch; if a test fails, fix the test wording before touching runtime files.

- [ ] **Step 4: Commit the test surface once it reflects the approved behavior**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels add \
  tests/level-select-interactions.spec.js \
  tests/level-select-polish.spec.js
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels \
  commit -m "test: lock compact level-select route behavior"
```

### Task 2: Finalize Markup And Interaction Logic

**Files:**
- Modify: `src/pages/level-select.html`
- Modify: `src/scripts/level-select-page.interactions.js`

- [ ] **Step 1: Make the page markup expose the compact route-switcher and per-button `data-level` hooks**

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

<div class="level-card level-easy is-active" id="level-panel-beginner" data-level="beginner">
  ...
  <button class="level-button" type="button" data-level="beginner">Enter foundations</button>
</div>
```

- [ ] **Step 2: Make the interaction file manage compact state and CTA-only launching**

```javascript
// src/scripts/level-select-page.interactions.js
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

function syncCompactLayout() {
  const compactMode = compactMedia.matches;

  elements.cards.forEach((card) => {
    const isActive = card.dataset.level === state.activeLevel;
    card.classList.toggle("is-active", isActive);
    card.hidden = compactMode ? !isActive : false;
  });

  elements.routeButtons.forEach((button) => {
    const isActive = button.dataset.level === state.activeLevel;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
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
```

- [ ] **Step 3: Re-run the focused interaction lane after the markup and JS are aligned**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels && npx playwright test tests/level-select-interactions.spec.js --reporter=line`
Expected: PASS for CTA-only launch, keyboard shortcuts, and reduced-motion flow.

- [ ] **Step 4: Commit the runtime contract changes**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels add \
  src/pages/level-select.html \
  src/scripts/level-select-page.interactions.js
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels \
  commit -m "feat: add compact route selector interactions"
```

### Task 3: Finalize Stylesheet Wiring And Compact Layout Rules

**Files:**
- Modify: `src/styles/css/level-select.css`
- Modify: `src/styles/css/level-select.details.responsive.css`
- Modify: `src/styles/css/level-select.polish.css`

- [ ] **Step 1: Keep the stylesheet hub importing the responsive detail file**

```css
/* src/styles/css/level-select.css */
@import url("/src/styles/css/level-select.polish.css");
@import url("/src/styles/css/level-select.details.responsive.css");
```

- [ ] **Step 2: Keep the narrow-screen responsive file focused on compact spacing and switcher visibility**

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
}
```

- [ ] **Step 3: Keep the polish stylesheet responsible for switcher styling and active-card emphasis**

```css
/* src/styles/css/level-select.polish.css */
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
  cursor: pointer;
}

.route-switcher-button.is-active,
.route-switcher-button[aria-pressed="true"] {
  border-color: var(--level-phosphor);
  color: var(--level-text-0);
  box-shadow:
    0 0 0 1px rgba(142, 203, 117, 0.14),
    0 16px 30px rgba(0, 0, 0, 0.28);
}

.level-card.is-active {
  border-color: color-mix(
    in srgb,
    var(--level-accent) 55%,
    rgba(255, 255, 255, 0.12)
  );
}
```

- [ ] **Step 4: Re-run the polish and scoreboard lane after the CSS updates**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels && npx playwright test tests/level-select-polish.spec.js tests/level-select-scoreboard.spec.js --reporter=line`
Expected: PASS for desktop readability, compact mobile selector behavior, and local progress/scoreboard rendering.

- [ ] **Step 5: Commit the stylesheet changes**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels add \
  src/styles/css/level-select.css \
  src/styles/css/level-select.details.responsive.css \
  src/styles/css/level-select.polish.css
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels \
  commit -m "style: polish compact level-select route layout"
```

### Task 4: Run Final Verification And Publish The Follow-up Branch

**Files:**
- Modify: `src/pages/level-select.html`
- Modify: `src/scripts/level-select-page.interactions.js`
- Modify: `src/styles/css/level-select.css`
- Modify: `src/styles/css/level-select.details.responsive.css`
- Modify: `src/styles/css/level-select.polish.css`
- Modify: `tests/level-select-interactions.spec.js`
- Modify: `tests/level-select-polish.spec.js`

- [ ] **Step 1: Run typecheck on the branch**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels && npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Re-run the full focused level-select lane**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels && npx playwright test tests/level-select-interactions.spec.js tests/level-select-polish.spec.js tests/level-select-scoreboard.spec.js --reporter=line`
Expected: PASS.

- [ ] **Step 3: Run `npm run verify` only after the stale-worktree cleanup plan has been executed**

Run: `cd /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels && npm run verify`
Expected: PASS after the stale `.worktrees/` directories from merged branches have been removed.

- [ ] **Step 4: Push the follow-up branch to GitHub**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels \
  push -u origin feature/level-select-compact-route-followup
```
