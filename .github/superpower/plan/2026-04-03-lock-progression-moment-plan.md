# Math Master Algebra — Lock Progression Moment Implementation Plan

**Goal:** Turn lock progression into a refined signature “seal breach” moment that feels rewarding, readable, and premium without blocking gameplay or violating reduced-motion/performance constraints.

**Architecture:** Keep the existing event-driven lock flow (`first-line-solved` / `problemLineCompleted` → `LockManager` → `lockLevelUpdated`) and refactor the visual layer to be **CSS-state driven**. `LockManager` will set data attributes on `#lock-display`; a dedicated stylesheet will render the cinematic motion, while the existing `lockLevelUpdated` event remains the cross-module contract.

**Tech Stack:** Browser-native JavaScript, DOM events, CSS custom properties + OKLCH tokens, Playwright, existing `npm` validation scripts.

**Source design:** Conversation-approved target area (“lock progression moment”) on 2026-04-03 plus the canonical design context in `task.md`.

**Assumption:** Because the final tone-choice question was superseded by the planning request, this plan uses a **refined operator-console / ceremonial unlock** tone — premium and decisive, not arcade-chaotic.

---

## Existing infrastructure

| Asset                      | Location                                                        | What it provides                                                         |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Lock core                  | `src/scripts/lock-manager.js`                                   | Singleton manager, start/reset/progression API                           |
| Lock event bindings        | `src/scripts/lock-manager.events.js`                            | Responds to `first-line-solved`, `stepCompleted`, `problemLineCompleted` |
| Lock animation helpers     | `src/scripts/lock-manager.animations.js`                        | Current per-level animation hooks and `lockLevelUpdated` dispatch        |
| Lock component loader      | `src/scripts/lock-manager.loader.js`                            | Loads component HTML and wraps it in `.lock-component-wrapper`           |
| Runtime page               | `src/pages/game.html`                                           | Lock scripts/styles load order                                           |
| Shared lock responsiveness | `src/styles/css/lock-responsive.css`                            | Shared wrapper scaling and active animation timing                       |
| Reduced motion             | `src/styles/css/lod-animations.reduced-motion.css`              | Global reduced-motion overrides                                          |
| Existing lock tests        | `tests/lock-components.spec.js`                                 | Split-style/component activation coverage                                |
| Existing perf scenario     | `tests/perf-scenarios.spec.js`, `tests/utils/perf-scenarios.js` | Lock transition runtime measurement                                      |
| Validation scripts         | `package.json`                                                  | `npm run lint`, `npm run verify`, `npm run typecheck`, `npm test`        |

---

## Phase 1: Define the lock-moment state contract

### Task 1.1: Write the failing behavior test for the new lock ceremony state

#### Task 1.1 — Step 1: Create the test file

- File: `tests/lock-progression-moment.spec.js`

- Code:

```javascript
// tests/lock-progression-moment.spec.js
import { expect, test } from "@playwright/test";

test.describe("Lock progression signature moment", () => {
  test("forceLockLevel decorates Panel A with tiered ceremony state", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    await page.waitForFunction(() => {
      return typeof window.lockManager?.forceLockLevel === "function";
    });

    await page.evaluate(() => {
      window.lockManager.forceLockLevel(3);
    });

    const display = page.locator("#lock-display");
    await expect(display).toHaveAttribute("data-lock-level", "3");
    await expect(display).toHaveAttribute("data-lock-tone", "warrior");
    await expect(display).toHaveAttribute(
      "data-lock-moment",
      /arming|surge|settled/,
    );
  });

  test("lockLevelUpdated includes tone and moment metadata", async ({
    page,
  }) => {
    await page.goto("/game.html?level=master");
    await page.waitForFunction(() => {
      return typeof window.lockManager?.forceLockLevel === "function";
    });

    const detail = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener(
          "lockLevelUpdated",
          (event) => resolve(event.detail),
          { once: true },
        );
        window.lockManager.forceLockLevel(6);
      });
    });

    expect(detail).toMatchObject({
      level: 6,
      tone: "master",
    });
    expect(["arming", "surge", "settled"]).toContain(detail.moment);
  });
});
```

#### Task 1.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/lock-progression-moment.spec.js --project=chromium
```

- Expected output:

```text
FAIL tests/lock-progression-moment.spec.js
  ✕ forceLockLevel decorates Panel A with tiered ceremony state
  ✕ lockLevelUpdated includes tone and moment metadata
```

### Task 1.2: Refactor `LockManager` animation helpers to publish visual state instead of hard-coded inline theatrics

#### Task 1.2 — Step 1: Update `src/scripts/lock-manager.animations.js`

- Replace the current `activateLockLevel` function and add the new helpers below.

- File: `src/scripts/lock-manager.animations.js`

- Code:

```javascript
const LOCK_MOMENT_TIMINGS = {
  SURGE_DELAY_MS: 24,
  SETTLE_DELAY_MS: 520,
  CLEANUP_DELAY_MS: 820,
};

const LOCK_TONES = {
  BEGINNER: "beginner",
  WARRIOR: "warrior",
  MASTER: "master",
};

proto.activateLockLevel = function activateLockLevel(level) {
  console.log(`🔒 Activating lock level ${level}`);

  const lockBody = this.container.querySelector(".lock-body");
  if (!lockBody) {
    console.warn("⚠️ Lock body not found for activation");
    return;
  }

  for (let lvl = 1; lvl <= 6; lvl += 1) {
    lockBody.classList.remove(`level-${lvl}-active`);
  }

  lockBody.classList.add(`level-${level}-active`);
  this.currentLockLevel = level;

  this.triggerLevelAnimation(lockBody, level);
  this.updateProgressIndicators(level);

  document.dispatchEvent(
    new CustomEvent("lockLevelUpdated", {
      detail: {
        level,
        tone: this.container.dataset.lockTone || this._resolveLockTone(level),
        moment: this.container.dataset.lockMoment || "settled",
      },
    }),
  );
};

proto._resolveLockTone = function _resolveLockTone(level) {
  const isMasterLevel = document.body.classList.contains("master-level");
  if (isMasterLevel || level >= 4) {
    return LOCK_TONES.MASTER;
  }
  if (level >= 2) {
    return LOCK_TONES.WARRIOR;
  }
  return LOCK_TONES.BEGINNER;
};

proto._clearLockMomentTimers = function _clearLockMomentTimers() {
  if (this._lockMomentSurgeTimer) {
    window.clearTimeout(this._lockMomentSurgeTimer);
    this._lockMomentSurgeTimer = null;
  }
  if (this._lockMomentSettleTimer) {
    window.clearTimeout(this._lockMomentSettleTimer);
    this._lockMomentSettleTimer = null;
  }
  if (this._lockMomentCleanupTimer) {
    window.clearTimeout(this._lockMomentCleanupTimer);
    this._lockMomentCleanupTimer = null;
  }
};

proto._applyLockMomentState = function _applyLockMomentState(lockBody, level) {
  const tone = this._resolveLockTone(level);
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = Math.min(level, 6) / 6;
  const wrapper = this.container.querySelector(".lock-component-wrapper");

  this._clearLockMomentTimers();

  this.container.classList.add("is-lock-live");
  this.container.classList.toggle("is-lock-master", tone === LOCK_TONES.MASTER);
  this.container.dataset.lockLevel = String(level);
  this.container.dataset.lockTone = tone;
  this.container.dataset.lockMotion = reducedMotion ? "reduced" : "full";
  this.container.dataset.lockMoment = reducedMotion ? "settled" : "arming";
  this.container.dataset.lockStatus = `Lock phase ${String(level).padStart(2, "0")} engaged`;
  this.container.style.setProperty("--lock-progress", progress.toFixed(2));
  this.container.style.setProperty(
    "--lock-intensity",
    String((0.78 + progress * 0.32).toFixed(2)),
  );
  this.container.setAttribute("aria-live", "polite");
  this.container.setAttribute(
    "aria-label",
    `Lock phase ${String(level).padStart(2, "0")} engaged`,
  );

  if (wrapper) {
    wrapper.classList.add("lock-ceremony-shell");
  }

  lockBody.classList.add("lock-body--ceremony");

  if (reducedMotion) {
    return;
  }

  this._lockMomentSurgeTimer = window.setTimeout(() => {
    this.container.dataset.lockMoment = "surge";
  }, LOCK_MOMENT_TIMINGS.SURGE_DELAY_MS);

  this._lockMomentSettleTimer = window.setTimeout(() => {
    this.container.dataset.lockMoment = "settled";
  }, LOCK_MOMENT_TIMINGS.SETTLE_DELAY_MS);

  this._lockMomentCleanupTimer = window.setTimeout(() => {
    lockBody.classList.remove("lock-body--ceremony");
  }, LOCK_MOMENT_TIMINGS.CLEANUP_DELAY_MS);
};

proto.triggerBeginnerAnimation = function triggerBeginnerAnimation(lockBody) {
  console.log("🎮 Triggering beginner level animation");
  this._applyLockMomentState(lockBody, 1);
};

proto.triggerWarriorAnimation = function triggerWarriorAnimation(
  lockBody,
  level,
) {
  console.log(`🟡 Triggering warrior level ${level} animation`);
  this._applyLockMomentState(lockBody, level);
};

proto.triggerMasterAnimation = function triggerMasterAnimation(
  lockBody,
  level,
) {
  console.log(`🔴 Triggering master level ${level} animation`);
  this._applyLockMomentState(lockBody, level);
};

proto.triggerGenericAnimation = function triggerGenericAnimation(
  lockBody,
  level,
) {
  console.log(`⚪ Triggering generic level ${level} animation`);
  this._applyLockMomentState(lockBody, level);
};
```

#### Task 1.2 — Step 2: Run the test and verify success

- Command:

```bash
npx playwright test tests/lock-progression-moment.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/lock-progression-moment.spec.js
  ✓ forceLockLevel decorates Panel A with tiered ceremony state
  ✓ lockLevelUpdated includes tone and moment metadata
```

#### Task 1.2 — Step 3: Run lint

- Command:

```bash
npm run lint
```

- Expected output:

```text
No new ESLint errors in lock-manager animation changes
```

---

## Phase 2: Add the signature “seal breach” visual layer

### Task 2.1: Write the failing wiring test for the new stylesheet

#### Task 2.1 — Step 1: Extend `tests/lock-progression-moment.spec.js`

- Add this test block to the same file:

```javascript
test("game page loads dedicated lock progression moment styles", async ({
  page,
}) => {
  await page.goto("/game.html?level=beginner");

  await expect(
    page.locator('link[href="/src/styles/css/lock-progression.moment.css"]'),
  ).toHaveCount(1);
});
```

#### Task 2.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/lock-progression-moment.spec.js --project=chromium
```

- Expected output:

```text
FAIL tests/lock-progression-moment.spec.js
  ✕ game page loads dedicated lock progression moment styles
```

### Task 2.2: Implement the new lock-moment stylesheet and load it in the game page

#### Task 2.2 — Step 1: Create `src/styles/css/lock-progression.moment.css`

- File: `src/styles/css/lock-progression.moment.css`

- Code:

```css
/* src/styles/css/lock-progression.moment.css */
#lock-display {
  position: relative;
  isolation: isolate;
  --lock-progress: 0.16;
  --lock-intensity: 1;
  --lock-accent: var(--shell-line);
  --lock-accent-soft: color-mix(in oklch, var(--shell-line) 28%, transparent);
  --lock-surface: color-mix(in oklch, var(--shell-panel) 88%, black 12%);
  --lock-signal: var(--shell-signal);
}

#lock-display[data-lock-tone="warrior"] {
  --lock-accent: var(--shell-signal);
  --lock-accent-soft: color-mix(in oklch, var(--shell-signal) 32%, transparent);
}

#lock-display[data-lock-tone="master"] {
  --lock-accent: var(--shell-alert);
  --lock-accent-soft: color-mix(in oklch, var(--shell-alert) 32%, transparent);
}

#lock-display::before,
#lock-display::after {
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

#lock-display::before {
  content: "";
  inset: clamp(10px, 2vw, 18px);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.88);
  border: 1px solid color-mix(in oklch, var(--lock-accent) 48%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in oklch, var(--lock-accent) 16%, transparent),
    0 0 calc(22px * var(--lock-intensity)) var(--lock-accent-soft);
  background:
    radial-gradient(
      circle at center,
      transparent 58%,
      color-mix(in oklch, var(--lock-accent) 18%, transparent) 72%,
      transparent 78%
    ),
    conic-gradient(
      from 180deg,
      transparent 0deg 236deg,
      color-mix(in oklch, var(--lock-accent) 54%, transparent) 266deg 316deg,
      transparent 346deg 360deg
    );
}

#lock-display::after {
  content: attr(data-lock-status);
  left: clamp(14px, 1.8vw, 22px);
  right: clamp(14px, 1.8vw, 22px);
  bottom: clamp(10px, 1.4vw, 18px);
  padding: 0.6rem 0.9rem 0.56rem;
  border: 1px solid color-mix(in oklch, var(--lock-accent) 42%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--lock-surface) 90%, transparent),
    color-mix(in oklch, var(--shell-bg) 84%, black 16%)
  );
  color: var(--shell-copy);
  font: 700 clamp(0.58rem, 0.8vw, 0.74rem)/1 var(--font-display);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0;
  transform: translateY(10px);
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 color-mix(in oklch, var(--lock-accent) 14%, transparent);
}

#lock-display .lock-component-wrapper {
  position: relative;
  z-index: 1;
  transition:
    transform 420ms var(--ease-out-expo),
    filter 420ms var(--ease-out-quart);
  will-change: transform, filter;
}

#lock-display .lock-body {
  transition:
    transform 420ms var(--ease-out-expo),
    box-shadow 420ms var(--ease-out-quart),
    filter 420ms var(--ease-out-quart);
  will-change: transform, box-shadow, filter;
}

#lock-display[data-lock-moment="arming"]::after,
#lock-display[data-lock-moment="surge"]::after,
#lock-display[data-lock-moment="settled"]::after {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 220ms var(--ease-out-quart),
    transform 220ms var(--ease-out-quint),
    border-color 220ms var(--ease-out-quart);
}

#lock-display[data-lock-moment="surge"]::before {
  opacity: 1;
  animation: lock-seal-breach 560ms var(--ease-out-expo) both;
}

#lock-display[data-lock-moment="surge"] .lock-component-wrapper {
  transform: scale(1.035);
  filter: drop-shadow(
    0 0 calc(24px * var(--lock-intensity))
      color-mix(in oklch, var(--lock-accent) 24%, transparent)
  );
}

#lock-display[data-lock-moment="surge"] .lock-body {
  transform: scale(1.04);
}

#lock-display[data-lock-moment="settled"]::before {
  opacity: 0.3;
  transform: scale(1);
  transition:
    opacity 260ms var(--ease-out-quart),
    transform 260ms var(--ease-out-quint);
}

#lock-display[data-lock-tone="beginner"] .lock-body.level-1-active,
#lock-display[data-lock-tone="beginner"] .lock-body.level-2-active,
#lock-display[data-lock-tone="beginner"] .lock-body.level-3-active {
  box-shadow:
    0 0 0 1px color-mix(in oklch, var(--shell-line) 22%, transparent),
    0 0 26px color-mix(in oklch, var(--shell-line) 22%, transparent);
}

#lock-display[data-lock-tone="warrior"] .lock-body.level-2-active,
#lock-display[data-lock-tone="warrior"] .lock-body.level-3-active {
  box-shadow:
    0 0 0 1px color-mix(in oklch, var(--shell-signal) 24%, transparent),
    0 0 32px color-mix(in oklch, var(--shell-signal) 24%, transparent);
}

#lock-display[data-lock-tone="master"] .lock-body.level-4-active,
#lock-display[data-lock-tone="master"] .lock-body.level-5-active,
#lock-display[data-lock-tone="master"] .lock-body.level-6-active {
  box-shadow:
    0 0 0 1px color-mix(in oklch, var(--shell-alert) 26%, transparent),
    0 0 38px color-mix(in oklch, var(--shell-alert) 28%, transparent);
}

@keyframes lock-seal-breach {
  0% {
    opacity: 0;
    transform: scale(0.86);
  }
  30% {
    opacity: 1;
  }
  65% {
    opacity: 0.85;
    transform: scale(1.03);
  }
  100% {
    opacity: 0.24;
    transform: scale(1.08);
  }
}
```

#### Task 2.2 — Step 2: Load the stylesheet in `src/pages/game.html`

- File: `src/pages/game.html`

- Insert immediately after:

```html
<link
  rel="stylesheet"
  href="/src/styles/css/lock-responsive.css?v=20251007-mobile-fix"
/>
```

- Inserted code:

```html
<link rel="stylesheet" href="/src/styles/css/lock-progression.moment.css" />
```

#### Task 2.2 — Step 3: Run the test and verify success

- Command:

```bash
npx playwright test tests/lock-progression-moment.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/lock-progression-moment.spec.js
  ✓ game page loads dedicated lock progression moment styles
```

---

## Phase 3: Reduced-motion and motion-token compliance

### Task 3.1: Write the failing reduced-motion test

#### Task 3.1 — Step 1: Extend `tests/lock-progression-moment.spec.js`

- Add this test block:

```javascript
test("reduced motion settles immediately and exposes a stable state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/game.html?level=beginner");
  await page.waitForFunction(() => {
    return typeof window.lockManager?.forceLockLevel === "function";
  });

  await page.evaluate(() => {
    window.lockManager.forceLockLevel(1);
  });

  const display = page.locator("#lock-display");
  await expect(display).toHaveAttribute("data-lock-motion", "reduced");
  await expect(display).toHaveAttribute("data-lock-moment", "settled");
});
```

#### Task 3.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/lock-progression-moment.spec.js --project=chromium
```

- Expected output:

```text
FAIL tests/lock-progression-moment.spec.js
  ✕ reduced motion settles immediately and exposes a stable state
```

### Task 3.2: Implement reduced-motion overrides and replace the shared elastic timing

#### Task 3.2 — Step 1: Update `src/styles/css/lod-animations.reduced-motion.css`

- File: `src/styles/css/lod-animations.reduced-motion.css`

- Add inside the existing `@media (prefers-reduced-motion: reduce)` block:

```css
#lock-display[data-lock-motion="reduced"]::before,
#lock-display[data-lock-motion="reduced"]::after,
#lock-display[data-lock-motion="reduced"] .lock-component-wrapper,
#lock-display[data-lock-motion="reduced"] .lock-body {
  animation: none !important;
  transition: none !important;
}

#lock-display[data-lock-motion="reduced"]::before {
  opacity: 0.22 !important;
  transform: none !important;
}

#lock-display[data-lock-motion="reduced"]::after {
  opacity: 1 !important;
  transform: none !important;
}
```

#### Task 3.2 — Step 2: Update the shared lock timing in `src/styles/css/lock-responsive.css`

- Replace:

```css
.lock-component-wrapper .lock-body.level-1-active,
.lock-component-wrapper .lock-body.level-2-active,
.lock-component-wrapper .lock-body.level-3-active,
.lock-component-wrapper .lock-body.level-4-active,
.lock-component-wrapper .lock-body.level-5-active,
.lock-component-wrapper .lock-body.level-6-active {
  animation-duration: 1.2s;
  animation-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

- With:

```css
.lock-component-wrapper .lock-body.level-1-active,
.lock-component-wrapper .lock-body.level-2-active,
.lock-component-wrapper .lock-body.level-3-active,
.lock-component-wrapper .lock-body.level-4-active,
.lock-component-wrapper .lock-body.level-5-active,
.lock-component-wrapper .lock-body.level-6-active {
  animation-duration: var(--animation-duration, 1.2s);
  animation-timing-function: var(--ease-out-quint);
}
```

#### Task 3.2 — Step 3: Run the test and verify success

- Command:

```bash
npx playwright test tests/lock-progression-moment.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/lock-progression-moment.spec.js
  ✓ reduced motion settles immediately and exposes a stable state
```

#### Task 3.2 — Step 4: Run lint

- Command:

```bash
npm run lint
```

- Expected output:

```text
No new ESLint errors in lock-motion accessibility changes
```

---

## Phase 4: Performance/regression coverage for the lock moment

### Task 4.1: Extend the existing performance scenario with a visual-state assertion

#### Task 4.1 — Step 1: Update `tests/perf-scenarios.spec.js`

- In the existing test named `lock transition scenario captures completion feedback`, add the block below immediately after `const snapshot = ...`:

```javascript
const displayState = await page.evaluate(() => {
  const display = document.getElementById("lock-display");
  return {
    tone: display?.getAttribute("data-lock-tone") ?? "",
    level: display?.getAttribute("data-lock-level") ?? "",
    moment: display?.getAttribute("data-lock-moment") ?? "",
  };
});

expect(["beginner", "warrior", "master"]).toContain(displayState.tone);
expect(Number(displayState.level)).toBeGreaterThanOrEqual(1);
expect(["surge", "settled"]).toContain(displayState.moment);
```

#### Task 4.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/perf-scenarios.spec.js --project=chromium --grep "lock transition scenario captures completion feedback"
```

- Expected output:

```text
FAIL tests/perf-scenarios.spec.js
  ✕ lock transition scenario captures completion feedback
```

### Task 4.2: Ensure the state persists long enough for perf instrumentation without adding churn

#### Task 4.2 — Step 1: Adjust `src/scripts/lock-manager.animations.js`

- In `_applyLockMomentState`, keep `data-lock-moment="settled"` on `#lock-display` after cleanup instead of clearing it. The cleanup timer should remove only the transient helper class.

- Confirm the cleanup block is:

```javascript
this._lockMomentCleanupTimer = window.setTimeout(() => {
  lockBody.classList.remove("lock-body--ceremony");
  this.container.dataset.lockMoment = "settled";
}, LOCK_MOMENT_TIMINGS.CLEANUP_DELAY_MS);
```

#### Task 4.2 — Step 2: Run the perf-focused test and verify success

- Command:

```bash
npx playwright test tests/perf-scenarios.spec.js --project=chromium --grep "lock transition scenario captures completion feedback"
```

- Expected output:

```text
PASS tests/perf-scenarios.spec.js
  ✓ lock transition scenario captures completion feedback
```

---

## Phase 5: Full validation

### Task 5.1: Run focused lock validation

#### Task 5.1 — Step 1: Run the lock-focused Playwright suite

- Command:

```bash
npx playwright test tests/lock-components.spec.js tests/lock-progression-moment.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/lock-components.spec.js
PASS tests/lock-progression-moment.spec.js
```

#### Task 5.1 — Step 2: Run the perf scenario regression

- Command:

```bash
npx playwright test tests/perf-scenarios.spec.js --project=chromium --grep "lock transition scenario captures completion feedback"
```

- Expected output:

```text
PASS tests/perf-scenarios.spec.js
```

#### Task 5.1 — Step 3: Run lint

- Command:

```bash
npm run lint
```

- Expected output:

```text
No new ESLint errors
```

#### Task 5.1 — Step 4: Run typecheck

- Command:

```bash
npm run typecheck
```

- Expected output:

```text
Typecheck passes without regressions
```

#### Task 5.1 — Step 5: Run repository verification

- Command:

```bash
npm run verify
```

- Expected output:

```text
Verification passes
```

#### Task 5.1 — Step 6: Run the full browser suite if the focused checks are green

- Command:

```bash
npm test
```

- Expected output:

```text
Existing browser coverage remains green
```

---

## Files to create or modify

| File                                               | Action | Purpose                                                                                           |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `tests/lock-progression-moment.spec.js`            | Create | TDD coverage for tiered lock state, stylesheet load, and reduced motion                           |
| `src/scripts/lock-manager.animations.js`           | Modify | Publish CSS-friendly state, preserve `lockLevelUpdated`, remove reliance on inline visual styling |
| `src/styles/css/lock-progression.moment.css`       | Create | Signature “seal breach” motion and status plaque for Panel A                                      |
| `src/pages/game.html`                              | Modify | Load the new lock-moment stylesheet                                                               |
| `src/styles/css/lod-animations.reduced-motion.css` | Modify | Ensure the new lock ceremony has an accessible static fallback                                    |
| `src/styles/css/lock-responsive.css`               | Modify | Replace shared elastic timing with repo-approved easing token                                     |
| `tests/perf-scenarios.spec.js`                     | Modify | Assert lock visual state during the existing perf scenario                                        |

---

## Success criteria

- Lock progression feels like a single memorable ceremonial moment, not scattered decorative animation
- Motion is driven by data attributes and CSS, not ad-hoc inline gradients/transforms
- Existing `lockLevelUpdated` event remains the integration contract
- Reduced-motion users get a stable, non-animated equivalent
- Panel A remains readable and non-blocking
- Lock transition perf scenario stays under the existing DOM query threshold
- `npm run lint`, `npm run typecheck`, `npm run verify`, and focused Playwright checks pass
