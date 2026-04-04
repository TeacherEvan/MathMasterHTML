# Math Master Algebra — Welcome Page Sith Redesign Implementation Plan

**Goal:** Redesign the welcome page so it feels like the same refined operator-console system as level select: darker, calmer, more premium, more accessible, and explicitly CTA-driven instead of body-wide click navigation.

**Architecture:** Keep the browser-native split (`index.html` + modular CSS + page scripts), but change the welcome-page interaction contract from **body-wide navigation** to **CTA-only navigation**. Use a DOM event (`welcomeCtaActivated`) for CTA activation so navigation and ripple behavior remain decoupled from input handling. Keep visual polish CSS-driven with reduced-motion fallbacks.

**Tech Stack:** HTML, CSS, browser-native JavaScript, Playwright, ESLint/verify pipeline, existing `npm` scripts.

**Source design:**

- `.github/superpower/ux/welcome-sith-aesthetic-jtbd.md`
- `.github/superpower/ux/welcome-sith-aesthetic-journey.md`
- `.github/superpower/ux/welcome-sith-aesthetic-flow.md`
- `src/styles/css/level-select.polish.css`

**Assumptions locked for this plan:**

- Primary CTA label: **Begin Training**
- Keep the welcome-page scoreboard modal
- Use a **fade-out** transition before navigation
- Do **not** redesign scoreboard modal visuals in this pass
- Use the real repo validation commands (`npm run verify`, `npm run typecheck`, `npm test`) rather than the stale Maven workspace tasks

---

## Existing implementation surface

| Area | File | Why it matters |
| --- | --- | --- |
| Welcome markup | `src/pages/index.html` | Current page structure, inline styles, quote, scoreboard button |
| CSS hub | `src/styles/css/index.css` | Import order for welcome page styles |
| Base layout | `src/styles/css/index.core.css` | Body, container, buttons |
| Hero styles | `src/styles/css/index.hero.css` | Title/logo/quote styling |
| Effects | `src/styles/css/index.effects.css` | Animations and ripple |
| Matrix background | `src/styles/css/index.matrix.css` | Matrix rain visual style |
| Responsive styles | `src/styles/css/index.responsive.css` | Mobile/touch behavior |
| Input orchestration | `src/scripts/index-page.core.js` | Current body click/keyboard handling |
| Navigation/ripple | `src/scripts/index-page.ripple.js` | Currently navigates after any click |
| Dynamic hero effects | `src/scripts/index-page.effects.js` | Current bright random flashing behavior |
| Scoreboard | `src/scripts/index-page.scoreboard.js` | Must remain functional and non-navigating |
| Existing welcome regression | `tests/welcome-scoreboard.spec.js` | Keeps scoreboard behavior covered |

---

## Phase 1: Lock the new DOM and accessibility contract with a failing test

### Task 1.1: Add a focused Playwright spec for the new welcome-page structure

#### Step 1: Create the failing test

- File: `tests/welcome-page-redesign.spec.js`

#### Step 2: Run the structure test and verify failure

- Command:

```bash
npx playwright test tests/welcome-page-redesign.spec.js --project=chromium
```

### Task 1.2: Implement the semantic welcome-page structure

#### Step 1: Update the welcome page markup in `src/pages/index.html`

- Remove the inline `<style>` block entirely.
- Remove the old `teacher-title`.
- Remove the old `continue-text`.
- Keep `#scoreboard-button` and the modal IDs unchanged so existing scoreboard tests survive.
- Introduce semantic `header`, `main`, `figure`, `figcaption`, `blockquote`, and CTA markup.

#### Step 2: Run the test and verify success

- Command:

```bash
npx playwright test tests/welcome-page-redesign.spec.js --project=chromium
```

---

## Phase 2: Make navigation intentional with a failing behavior test

### Task 2.1: Add failing tests for CTA-only navigation and keyboard activation

#### Step 1: Extend `tests/welcome-page-redesign.spec.js`

- Add coverage that:
  - scoreboard interactions do not navigate
  - clicking outside the CTA does not navigate
  - Enter/Space on the CTA navigates
  - CTA click navigates to level select

#### Step 2: Run the visual contract test and verify failure

- Command:

```bash
npx playwright test tests/welcome-page-redesign.spec.js --project=chromium
```

### Task 2.2: Refactor the page input flow to CTA-only navigation

#### Step 1: Update `src/scripts/index-page.core.js`

- Replace body-wide click navigation with CTA-targeted activation.
- Dispatch a `welcomeCtaActivated` event with activation coordinates.
- Keep scoreboard keyboard handling intact.

#### Step 2: Update `src/scripts/index-page.ripple.js`

- Listen for `welcomeCtaActivated`.
- Render ripple from activation coordinates.
- Apply page fade-out and navigate to `/src/pages/level-select.html`.
- Guard against duplicate navigation.

#### Step 3: Run the tests and verify success

- Command:

```bash
npx playwright test tests/welcome-page-redesign.spec.js --project=chromium
```

---

## Phase 3: Apply the new visual system with a failing style/reduced-motion test

### Task 3.1: Add failing visual contract tests

#### Step 1: Extend the test file

- Add coverage for:
  - welcome background color using the refined palette
  - CTA minimum height of 48px
  - reduced-motion disables logo animation
  - reduced-motion disables floating symbol animation

#### Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/welcome-page-redesign.spec.js --project=chromium
```

### Task 3.2: Rebuild the welcome CSS around shared tokens and restrained motion

#### Step 1: Create `src/styles/css/index.theme.css`

- Add welcome-specific tokens aligned with `level-select.polish.css`.
- Set the new dark background, text, accents, radii, and transitions.

#### Step 2: Update `src/styles/css/index.css`

- Import `index.theme.css` before the existing layers.

#### Step 3: Replace the old neon layout layer in `src/styles/css/index.core.css`

- Add refined layout, header, CTA button, focus ring, and `sr-only` utility.

#### Step 4: Replace `src/styles/css/index.hero.css`

- Replace glow-heavy hero styles with restrained title/logo/quote styling.

#### Step 5: Replace `src/styles/css/index.effects.css`

- Add restrained ripple, symbol drift, logo motion, and reduced-motion overrides.

#### Step 6: Align `src/styles/css/index.matrix.css` and `src/styles/css/index.responsive.css`

- Make the matrix treatment and responsive behavior visually consistent with level select.

#### Step 7: Tone down `src/scripts/index-page.effects.js`

- Remove flashy random color cycling.
- Keep only subtle reduced-motion-aware body-state behavior if needed.

#### Step 8: Run the tests and verify success

- Command:

```bash
npx playwright test tests/welcome-page-redesign.spec.js --project=chromium
```

---

## Phase 4: Protect the existing scoreboard and touch-device behavior

### Task 4.1: Run the welcome-page regressions on desktop and touch

#### Step 1: Run the focused regression pack

- Command:

```bash
npx playwright test tests/welcome-page-redesign.spec.js tests/welcome-scoreboard.spec.js --project=chromium --project=pixel-7
```

#### Step 2: If `welcome-scoreboard.spec.js` fails, make only selector-safe adjustments

- Keep `#scoreboard-button`
- Keep `#scoreboard-modal`
- Keep `#scoreboard-close-button`
- Do not change scoreboard storage/render logic unless a real regression appears

#### Step 3: Re-run the same focused pack

---

## Phase 5: Full repository verification

### Task 5.1: Run repo validation commands in increasing scope

1. `npm run verify`
2. `npm run typecheck`
3. `npm test`
4. `npm run test:competition:smoke`

---

## Files this plan expects to change

| File | Purpose |
| --- | --- |
| `src/pages/index.html` | Semantic structure, new CTA, head metadata, remove inline style block |
| `src/styles/css/index.css` | Import new theme layer |
| `src/styles/css/index.theme.css` | New shared welcome tokens and background system |
| `src/styles/css/index.core.css` | New layout, buttons, focus ring, sr-only utility |
| `src/styles/css/index.hero.css` | Refined logo, quote, title, subtitle |
| `src/styles/css/index.effects.css` | Ripple, subtle motion, reduced-motion override |
| `src/styles/css/index.matrix.css` | Match level-select matrix treatment |
| `src/styles/css/index.responsive.css` | Touch/mobile layout |
| `src/scripts/index-page.core.js` | CTA-only activation and event dispatch |
| `src/scripts/index-page.ripple.js` | Event-driven ripple + fade + navigation |
| `src/scripts/index-page.effects.js` | Replace flashy random JS effects |
| `tests/welcome-page-redesign.spec.js` | New regression coverage for structure, navigation, motion |
