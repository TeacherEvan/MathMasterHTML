# Plan: Android WebView Panel C Recovery
**Date:** 2026-04-10
**Source Design:** `.github/superpower/brainstorm/2026-04-09-mobile-recovery-design.md`
**Status:** Approved for execution

## Goal
Restore mobile Panel C target visibility when Android WebView reports desktop-like pointer signals and pushes gameplay into desktop symbol-rain behavior.

## Architecture
Fix compact/mobile classification at the runtime boundary in `src/scripts/display-manager.js`, let `src/scripts/3rdDISPLAY.js` and the existing symbol-rain helpers consume that corrected state unchanged, and verify the behavior through real browser runtime contracts in existing Playwright suites.

## Validation Rules
- Use a focused failing spec first for each milestone.
- Make the smallest owned-surface runtime change.
- Re-run the focused lane green.
- Finish with `npm run verify` and `npm run typecheck`.

## Milestones

### Milestone 1: Reproduce and lock the Android WebView regression
Deliverable: failing browser contracts that prove Android WebView-like runtimes are misclassified as desktop-like and that Panel C loses visible mobile targets.

Validation:
- `npx playwright test tests/game-portrait-device-contract.spec.js --project=chromium --grep "Android WebView-like touch runtimes" --reporter=line`
- `npx playwright test tests/symbol-rain.mobile.spec.js --project=chromium --grep "Android WebView-like runtime" --reporter=line`

Rollback:
- Revert only new tests if the reproduction harness is invalid.

### Milestone 2: Fix compact detection at the display-manager boundary
Deliverable: Android WebView-like touch runtimes are classified as compact/mobile even when coarse-pointer media queries lie.

Validation:
- `npx playwright test tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=chromium --grep "Android WebView-like|WebView-like runtime" --reporter=line`

Rollback:
- Revert `src/scripts/display-manager.js` if the focused WebView lane regresses.

### Milestone 3: Re-run the mobile baseline and finish verification
Deliverable: existing mobile layout, portrait, and symbol-rain contracts stay green after the display-manager fix.

Validation:
- `npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --project=chromium --reporter=line`
- `npm run verify`
- `npm run typecheck`

Rollback:
- Revert the display-manager fallback and reassess the classification rule rather than patching downstream consumers.

## Tasks

### Task 0 [S] Environment and baseline
Files: none.

Run:
```bash
node --version
npm --version
npm install --prefer-ipv4
npx playwright test tests/game-mobile-layout.spec.js tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --reporter=line
```

Expected:
- Node `>=18`, npm available, dependencies installed.
- Existing standard mobile contracts are green before new regression coverage is added.

### Task 1 [M] Write the failing Android WebView detection contract
Files:
- `tests/game-portrait-device-contract.spec.js`

Add a Chromium-only test that creates a browser context manually with:
- Android WebView-like user agent containing `Android`, `Mobile`, and `wv`
- touch enabled
- a wide embedded viewport such as `980 x 735`
- an init script that forces `window.matchMedia("(hover: none) and (pointer: coarse)")` to return `false`

Planned test shape:
```js
test("treats Android WebView-like touch runtimes as compact when coarse-pointer media queries lie", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 980, height: 735 },
    screen: { width: 980, height: 735 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query === "(hover: none) and (pointer: coarse)") {
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        };
      }
      return originalMatchMedia(query);
    };
  });

  await page.goto("/src/pages/game.html?level=beginner", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(() => window.displayManager?.getCurrentResolution?.());

  const state = await page.evaluate(() => ({
    resolution: window.displayManager?.getCurrentResolution?.() ?? null,
    bodyClasses: document.body.className,
  }));

  expect(state.resolution?.name).toBe("mobile");
  expect(state.resolution?.isCompactViewport).toBe(true);
  expect(state.bodyClasses).toContain("viewport-compact");

  await context.close();
});
```

Expected result after only writing the test: the test fails because current detection returns a desktop-like resolution and lacks `viewport-compact`.

### Task 2 [XS] Run the detection contract red
Files:
- `tests/game-portrait-device-contract.spec.js`

Run:
```bash
npx playwright test tests/game-portrait-device-contract.spec.js --project=chromium --grep "Android WebView-like touch runtimes" --reporter=line
```

Expected:
```text
FAIL tests/game-portrait-device-contract.spec.js
  Gameplay portrait device contract
    ✘ treats Android WebView-like touch runtimes as compact when coarse-pointer media queries lie
```

### Task 3 [M] Write the failing Panel C integration contract for Android WebView
Files:
- `tests/symbol-rain.mobile.spec.js`

Add a Chromium-only test that uses the same manual WebView-like context shape and confirms gameplay reaches an interactive state with a visible live symbol in Panel C.

Planned test shape:
```js
test("keeps live Panel C targets visible in an Android WebView-like runtime", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 980, height: 735 },
    screen: { width: 980, height: 735 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query === "(hover: none) and (pointer: coarse)") {
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        };
      }
      return originalMatchMedia(query);
    };
  });

  await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
    waitUntil: "domcontentloaded",
  });

  const startButton = page.locator("#start-game-btn");
  if (await startButton.isVisible()) {
    await startButton.click({ force: true });
  }

  await page.waitForFunction(() => {
    const state = window.displayManager?.getCurrentResolution?.();
    return (
      state?.isCompactViewport === true &&
      document.body.classList.contains("viewport-compact")
    );
  });

  await page.locator("#panel-c .falling-symbol").first().waitFor({
    state: "visible",
    timeout: 10000,
  });

  await context.close();
});
```

Expected result after only writing the test: the spec fails because Panel C never produces a visible live target in the simulated WebView regression.

### Task 4 [XS] Run the Panel C contract red
Files:
- `tests/symbol-rain.mobile.spec.js`

Run:
```bash
npx playwright test tests/symbol-rain.mobile.spec.js --project=chromium --grep "Android WebView-like runtime" --reporter=line
```

Expected:
```text
FAIL tests/symbol-rain.mobile.spec.js
  Symbol rain mobile interactions
    ✘ keeps live Panel C targets visible in an Android WebView-like runtime
```

### Task 5 [M] Implement the minimal display-manager fallback
Files:
- `src/scripts/display-manager.js`

Implementation rule: keep the fix inside the display-manager boundary. Do not patch symbol-rain sizing or spawn logic unless the focused tests still fail after the boundary fix.

Planned implementation shape:
```js
getMobilePlatformHints() {
  const userAgent = navigator.userAgent || "";
  const maxTouchPoints =
    typeof navigator.maxTouchPoints === "number"
      ? navigator.maxTouchPoints
      : 0;
  const hasTouchRuntime =
    maxTouchPoints > 0 ||
    window.matchMedia?.("(any-pointer: coarse)")?.matches === true;

  const isAndroid = /Android/i.test(userAgent);
  const isPhoneClassMobileUa = /Mobile/i.test(userAgent);
  const isWebView = /\bwv\b|; wv\)|Version\/\d+\.\d+.*Chrome\//i.test(userAgent);

  return {
    hasTouchRuntime,
    isAndroid,
    isPhoneClassMobileUa,
    isWebView,
    isAndroidPhoneLikeRuntime:
      hasTouchRuntime && isAndroid && (isPhoneClassMobileUa || isWebView),
  };
}

getViewportState({
  width = window.innerWidth,
  height = window.innerHeight,
} = {}) {
  const coarsePointerQuery = window.matchMedia?.(
    "(hover: none) and (pointer: coarse)",
  );
  const hasCoarsePointer = Boolean(coarsePointerQuery?.matches);
  const platformHints = this.getMobilePlatformHints();
  const {
    mobileMaxWidth,
    compactMaxWidth,
    compactMaxHeight,
    compactLandscapeWidth,
    compactLandscapeMaxHeight,
  } = this.compactViewportConfig;

  const isLandscape = width >= height;
  const isPortrait = height > width;
  const isCompactNarrowViewport = width <= mobileMaxWidth;
  const isCompactLandscapeTouch =
    hasCoarsePointer &&
    isLandscape &&
    width <= compactLandscapeWidth &&
    height <= compactLandscapeMaxHeight;
  const isCompactShortViewport =
    width <= compactMaxWidth && height <= compactMaxHeight;
  const isCompactAndroidWebViewFallback =
    platformHints.isAndroidPhoneLikeRuntime &&
    !hasCoarsePointer &&
    width <= compactMaxWidth &&
    height <= compactLandscapeWidth;

  const isCompactViewport =
    isCompactNarrowViewport ||
    isCompactLandscapeTouch ||
    isCompactShortViewport ||
    isCompactAndroidWebViewFallback;

  const shouldShowRotationOverlay =
    (hasCoarsePointer || platformHints.isAndroidPhoneLikeRuntime) &&
    isCompactViewport &&
    isPortrait &&
    width <= mobileMaxWidth;

  return {
    width,
    height,
    hasCoarsePointer,
    isLandscape,
    isPortrait,
    isCompactNarrowViewport,
    isCompactLandscapeTouch,
    isCompactShortViewport,
    isCompactAndroidWebViewFallback,
    isCompactViewport,
    shouldShowRotationOverlay,
  };
}
```

Expected: Android WebView-like touch runtimes become compact/mobile even when the coarse-pointer media query lies, while existing standard mobile and tablet contracts remain intact.

### Task 6 [S] Run the focused WebView contracts green
Files:
- `tests/game-portrait-device-contract.spec.js`
- `tests/symbol-rain.mobile.spec.js`

Run:
```bash
npx playwright test tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=chromium --grep "Android WebView-like|WebView-like runtime" --reporter=line
```

Expected:
```text
PASS tests/game-portrait-device-contract.spec.js
PASS tests/symbol-rain.mobile.spec.js
```

### Task 7 [S] Run the existing mobile regression lane
Files:
- `tests/game-mobile-layout.spec.js`
- `tests/game-mobile-layout.ultranarrow.spec.js`
- `tests/game-portrait-device-contract.spec.js`
- `tests/symbol-rain.mobile.spec.js`

Run:
```bash
npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --project=chromium --reporter=line
```

Expected: all targeted mobile layout, portrait contract, and symbol-rain tests pass on `pixel-7`, `iphone-13`, and `chromium`.

### Task 8 [S] Run repo validation and document the boundary rule
Files:
- `src/scripts/display-manager.js`
- `Docs/SystemDocs/ARCHITECTURE.md`

Add a short note in the display/layout section that compact detection includes an Android WebView fallback when touch runtimes misreport pointer media queries, and that symbol-rain consumes that shared contract rather than doing its own user-agent detection.

Run:
```bash
npm run verify
npm run typecheck
```

Expected: `verify` and `typecheck` pass.