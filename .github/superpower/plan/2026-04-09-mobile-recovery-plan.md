# Plan: Mobile Recovery MVP And Sequenced Stabilization
**Date:** 2026-04-09
**Source Design:** `.github/superpower/brainstorm/2026-04-09-mobile-recovery-design.md`
**Status:** Approved for execution

## Goal
Restore a clear mobile-first recovery path, starting with a contained level-select MVP and then sequencing the remaining Android issues by runtime ownership and validation surface.

## Architecture
Keep the existing script-tag runtime, preserve the current level-select route-switcher plus active-card contract, diagnose Panel C through its owned symbol-rain surface, diagnose gameplay overlap through the existing mobile boundary and Evan runtime surfaces, and treat progressive drums as an integration audit first.

## Validation Rules
- Use a focused failing spec first for each milestone.
- Make the smallest owned-surface runtime change.
- Re-run the focused lane green.
- Finish each milestone with `npm run verify` and `npm run typecheck`.

## Milestones

### Milestone 1: Level-select mobile MVP
Deliverable: one unmistakable mobile launch CTA, reduced copy clutter, preserved route-switcher and keyboard launch contract.

Validation:
- `npx playwright test tests/level-select-polish.spec.js tests/level-select-interactions.spec.js --project=pixel-7 --project=chromium --reporter=line`
- `npm run verify`
- `npm run typecheck`

Rollback:
- Revert the milestone commit if isolated to level-select files.

### Milestone 2: Panel C symbol-rain diagnosis and repair
Deliverable: touch-accurate mobile proof that live targets appear and remain tappable in Panel C.

Validation:
- `npx playwright test tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --reporter=line`
- `npm run verify`
- `npm run typecheck`

Rollback:
- Keep test-harness changes separate from runtime changes and revert milestone commit if needed.

### Milestone 3: Gameplay mobile layout and Evan stabilization
Deliverable: controls stop overlapping/shifting on narrow mobile, Evan UI remains smooth and within current boundary contracts.

Validation:
- `npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js --project=pixel-7 --reporter=line`
- `npx playwright test tests/evan-helper.flow.spec.js tests/evan-helper.controls.spec.js tests/evan-helper.ui.spec.js --project=pixel-7 --reporter=line`
- `npm run verify`
- `npm run typecheck`

Rollback:
- Keep layout CSS changes separate from Evan/runtime changes where practical and revert milestone commit if needed.

### Milestone 4: Progressive drum integration audit
Deliverable: prove whether progression audio is already wired correctly in live gameplay; only add code if the gameplay integration spec fails.

Validation:
- `npx playwright test tests/drum-progressive.spec.js tests/drum-audio-loader.spec.js tests/drum-sequencer.spec.js tests/drum-fallback.spec.js --project=chromium --reporter=line`
- `npm run verify`
- `npm run typecheck`

Rollback:
- If only audit/spec work is added, revert the milestone commit if needed.

## Tasks

### Task 0 [S] Environment setup
Files: none.

Run:
```bash
node --version
npm --version
npm install --prefer-ipv4
```

Run:
```bash
npx playwright test tests/level-select-polish.spec.js tests/level-select-interactions.spec.js --project=pixel-7 --project=chromium --reporter=line
```

Expected:
- Node `>=18`, npm available, install completes without errors.
- Current level-select baseline is green before adding the new MVP contract.

### Task 1 [S] Write the failing mobile CTA-first MVP test
Files:
- `tests/level-select-polish.spec.js`

Add a new narrow-mobile assertion that proves three things at once: the active route keeps one obvious launch button visible, lower-priority support content is reduced, and the launch surface remains comfortably inside the first screen.

Planned test shape:
```js
test("keeps one unmistakable launch CTA on narrow mobile", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/src/pages/level-select.html", {
    waitUntil: "domcontentloaded",
  });
  await waitForCardsToSettle(page);

  const activeCard = page.locator('.level-card[data-level="beginner"]');
  const cta = activeCard.locator(".level-button");
  const ctaHint = activeCard.locator(".level-cta-caption");
  const hiddenNoise = activeCard.locator(
    ".best-score-stat, .total-score-stat, .stat[data-mobile-priority='low']",
  );

  await expect(cta).toBeVisible();
  await expect(ctaHint).toBeVisible();
  await expect(hiddenNoise).toHaveCount(0);

  const [cardBox, ctaBox] = await Promise.all([
    activeCard.boundingBox(),
    cta.boundingBox(),
  ]);

  expect(cardBox).toBeTruthy();
  expect(ctaBox).toBeTruthy();
  expect(ctaBox.y + ctaBox.height).toBeLessThanOrEqual(915);
  expect(ctaBox.height).toBeGreaterThanOrEqual(48);
});
```

Expected result after only writing the test: the spec fails because the CTA caption and low-priority mobile filtering do not exist yet.

### Task 2 [XS] Run the new failing Milestone 1 test
Files:
- `tests/level-select-polish.spec.js`

Run:
```bash
npx playwright test tests/level-select-polish.spec.js --project=pixel-7 --grep "unmistakable launch CTA" --reporter=line
```

Expected:
```text
FAIL tests/level-select-polish.spec.js
  Level select polish
    ✘ keeps one unmistakable launch CTA on narrow mobile
```

### Task 3 [M] Implement the level-select mobile MVP with the smallest markup/CSS change set
Files:
- `src/pages/level-select.html`
- `src/styles/css/level-select.cards.css`
- `src/styles/css/level-select.details.responsive.css`
- `src/scripts/level-select-page.interactions.js` only if the active-card class contract needs a tiny hook adjustment.

Implementation intent:
```html
<p class="level-description">
  <span class="level-description-desktop">
    Build the habit. Read the equation, isolate the pattern, and settle into
    addition and subtraction with control.
  </span>
  <span class="level-description-mobile">Addition and subtraction warm-up.</span>
</p>
<p class="level-cta-caption">Tap the route button to start</p>
```

```css
@media (max-width: 768px) {
  .level-description-desktop {
    display: none;
  }

  .level-description-mobile {
    display: inline;
  }

  .level-card .best-score-stat,
  .level-card .total-score-stat,
  .level-card .stat[data-mobile-priority="low"] {
    display: none;
  }

  .level-card.is-active .level-button {
    position: relative;
    min-height: 3rem;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.16), 0 0 18px currentColor;
  }

  .level-card.is-active .level-button::after {
    content: "";
    position: absolute;
    inset: -0.25rem;
    border-radius: inherit;
    border: 2px solid currentColor;
    animation: level-cta-pulse 1.6s ease-out infinite;
  }

  .level-cta-caption {
    display: block;
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
}

@media (prefers-reduced-motion: reduce) {
  .level-card.is-active .level-button::after {
    animation: none;
  }
}
```

Expected: no navigation contract changes; only clearer CTA hierarchy and trimmed mobile noise.

### Task 4 [S] Run the Milestone 1 green lane and repo validation
Files:
- `tests/level-select-polish.spec.js`
- `tests/level-select-interactions.spec.js`

Run:
```bash
npx playwright test tests/level-select-polish.spec.js tests/level-select-interactions.spec.js --project=pixel-7 --project=chromium --reporter=line
npm run verify
npm run typecheck
```

Expected: level-select focused tests pass, then repo verification and typecheck pass.

### Task 5 [S] Add a failing live-rain visibility contract for Panel C on mobile
Files:
- `tests/symbol-rain.mobile.spec.js`
- `tests/utils/onboarding-runtime.js` only if a reusable readiness helper is required.

Add a new spec that asserts a live falling symbol becomes visible in Panel C shortly after interactive gameplay begins and remains touch-targetable.

Planned test shape:
```js
test("shows a live falling symbol in Panel C after gameplay becomes interactive", async ({
  page,
}, testInfo) => {
  test.skip(!["pixel-7", "iphone-13"].includes(testInfo.project.name));
  await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
  await dismissBriefingAndWaitForInteractiveGameplay(page);

  await expect(page.locator("#panel-c")).toBeVisible();
  await page.locator("#panel-c .falling-symbol").first().waitFor({
    state: "visible",
    timeout: 4000,
  });
});
```

Expected result after only writing the test: it fails on the affected mobile project if rain is absent or hidden.

### Task 6 [XS] Run the new failing Panel C contract on mobile
Files:
- `tests/symbol-rain.mobile.spec.js`

Run:
```bash
npx playwright test tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --grep "shows a live falling symbol" --reporter=line
```

Expected:
```text
FAIL tests/symbol-rain.mobile.spec.js
  Symbol rain mobile interactions
    ✘ shows a live falling symbol in Panel C after gameplay becomes interactive
```

### Task 7 [M] Implement the minimal Panel C repair in the owned runtime surface indicated by the failure
Files:
- likely `src/scripts/3rdDISPLAY.js`
- `src/scripts/symbol-rain.spawn.js`
- `src/scripts/symbol-rain.interactions.js`
- `src/scripts/symbol-rain.helpers.interactions.js`

Implementation rule: do not touch gameplay/worm/layout modules here. If the failure shows zero-sized or paused rain, fix initialization or spawn resume in the Panel C runtime. If the failure shows symbols exist but taps die after first interaction, fix the touch pointer lifecycle in the symbol-rain interaction layer.

Expected: Panel C produces visible live symbols and mobile touch remains responsive across successive taps.

### Task 8 [S] Run the Milestone 2 green lane and repo validation
Files:
- `tests/symbol-rain.mobile.spec.js`

Run:
```bash
npx playwright test tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --reporter=line
npm run verify
npm run typecheck
```

Expected: mobile rain spec passes on both mobile projects, then repo verification and typecheck pass.

### Task 9 [S] Add failing mobile layout and Evan stability assertions
Files:
- `tests/game-mobile-layout.ultranarrow.spec.js`
- `tests/evan-helper.ui.spec.js`
- `tests/evan-helper.flow.spec.js` if runtime input state needs a sharper assertion.

Add one ultra-narrow layout assertion for non-overlapping controls and one Evan assertion for stable visible area in preview/help state.

Planned additions:
```js
expect(layout.help.right).toBeLessThanOrEqual(layout.viewport.width + 1);
expect(layout.clarify.right).toBeLessThanOrEqual(layout.viewport.width + 1);
expect(Math.abs(layout.help.top - layout.clarify.top)).toBeLessThanOrEqual(8);
```

```js
test("evan shell does not push core controls outside the visible viewport", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.EvanPresenter?.show();
    document.body.classList.add("evan-layout-preview");
  });

  const helpBox = await page.locator("#help-button").boundingBox();
  const backBox = await page.locator("#back-button").boundingBox();

  expect(helpBox).toBeTruthy();
  expect(backBox).toBeTruthy();
  expect(helpBox.right).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(backBox.right).toBeLessThanOrEqual(page.viewportSize().width + 1);
});
```

Expected: at least one of these assertions should fail if the user’s overlap/shift report is still present.

### Task 10 [XS] Run the new failing mobile/Evan checks
Files:
- `tests/game-mobile-layout.ultranarrow.spec.js`
- `tests/evan-helper.ui.spec.js`

Run:
```bash
npx playwright test tests/game-mobile-layout.ultranarrow.spec.js tests/evan-helper.ui.spec.js --project=pixel-7 --reporter=line
```

Expected: one or more new assertions fail, proving the overlap or Evan instability contract.

### Task 11 [M] Implement the minimal gameplay mobile/Evan stabilization
Files:
- likely `src/styles/css/game-responsive.mobile-landscape.css`
- `src/styles/css/console.responsive.css`
- `src/scripts/display-manager.js`
- `src/scripts/evan-helper.presenter.js`
- `src/scripts/evan-helper.controller.runtime.js`
- `src/pages/game.html` only if placement structure itself is the blocker.

Implementation rule: do not patch JS-owned sizing with random CSS overrides. If the issue is placement/spacing, adjust the owned mobile layout surface. If the issue is Evan input/preview timing, adjust Evan/runtime-coordinator behavior instead of masking it with visual transitions.

Expected: controls stay in-bounds, touch targets remain at least `44px`, Evan UI stays visible without destabilizing the core controls.

### Task 12 [S] Run the Milestone 3 green lane and repo validation
Files:
- `tests/game-mobile-layout.ultranarrow.spec.js`
- `tests/game-mobile-layout.spec.js`
- `tests/evan-helper.ui.spec.js`
- `tests/evan-helper.flow.spec.js`
- `tests/evan-helper.controls.spec.js`

Run:
```bash
npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js --project=pixel-7 --reporter=line
npx playwright test tests/evan-helper.flow.spec.js tests/evan-helper.controls.spec.js tests/evan-helper.ui.spec.js --project=pixel-7 --reporter=line
npm run verify
npm run typecheck
```

Expected: focused mobile layout and Evan lanes pass, then repo verification and typecheck pass.

### Task 13 [S] Add a gameplay-runtime drum integration audit spec
Files:
- `tests/drum-progressive.spec.js`

Add a characterization spec that uses the real game runtime path and confirms drum complexity advances after gameplay is interactive, not only after synthetic document events.

Planned test shape:
```js
test("gameplay runtime advances drum complexity after real line progress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__MM_ENABLE_AUDIO_IN_TESTS = true;
  });
  await page.goto("/game.html?level=beginner&evan=off&preload=off", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(() => Boolean(window.CyberpunkInteractionAudio));
  const before = await page.evaluate(
    () => window.CyberpunkInteractionAudio?._drumComplexity ?? null,
  );

  await page.evaluate(() => {
    document.dispatchEvent(
      new CustomEvent("problemLineCompleted", {
        detail: { lineNumber: 1, totalLines: 6, isLastStep: false },
      }),
    );
  });

  await expect
    .poll(() =>
      page.evaluate(() => window.CyberpunkInteractionAudio?._drumComplexity ?? null),
    )
    .toBeGreaterThan(before);
});
```

Expected: this may already pass, which would prove the feature exists and the remaining issue is audibility/user expectation rather than missing progression logic.

### Task 14 [XS] Run the drum gameplay audit
Files:
- `tests/drum-progressive.spec.js`

Run:
```bash
npx playwright test tests/drum-progressive.spec.js tests/drum-audio-loader.spec.js tests/drum-sequencer.spec.js tests/drum-fallback.spec.js --project=chromium --reporter=line
```

Expected: either all pass, closing the “missing implementation” question, or the new gameplay-runtime assertion fails and activates Task 15.

### Task 15 [M] Only if Task 14 is red, implement the minimal progression-audio wiring fix
Files:
- likely `src/pages/game.html`
- `src/scripts/interaction-audio.cyberpunk.js`
- `src/scripts/interaction-audio.cyberpunk.drums.loader.js`
- `src/scripts/interaction-audio.cyberpunk.drums.sequencer.js`
- `src/scripts/interaction-audio.cyberpunk.drums.playback.js`
- `src/scripts/interaction-audio.cyberpunk.drums.patterns.js`

Implementation rule: only repair the missing load-order or event wiring proven by the failing gameplay spec. Do not rewrite the whole drum subsystem.

Expected: gameplay progression updates drum complexity/state in live runtime.

### Task 16 [S] Final milestone verification and work log update
Files:
- `JOBCARD.md` if milestone work changed user-visible behavior or closed the progression-status question.

Run:
```bash
npm run verify
npm run typecheck
```

Expected: final repo validation passes. Update `JOBCARD.md` with the milestone outcomes that actually landed.

## Parallel Note
After Milestone 1 is complete, Milestone 4’s drum audit can run in parallel with Milestone 3 if a separate executor handles it. Everything else stays sequential.

## Recommended First Implementation Task
Add the failing narrow-mobile CTA assertion in `tests/level-select-polish.spec.js`, then drive the smallest HTML/CSS fix from that failure.