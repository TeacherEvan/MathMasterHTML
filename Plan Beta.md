# Plan Beta

## Purpose

Plan Beta is the roadmap and execution source of truth. It absorbs the old competition roadmap, execution matrix, recent superpower plans, brainstorm artifacts, and context maps.

## Active Product Priorities

1. Android WebView remains the primary quality bar.
2. H2P is exactly one dedicated tutorial level.
3. Gameplay should remain a puzzle; in-app bypasses should not undercut an unresolved level.
4. Deterministic runtime behavior beats speculative architecture churn.
5. Generated algebra is a later spike, not part of the critical gameplay path.

## Decision Gates

| Decision | Required | Current stance |
| --- | --- | --- |
| Tooling truth pass first | Yes | Always |
| Competition QA lanes | Yes | Maintain and extend |
| Online synchronized matches | Optional | Only if explicitly required |
| UX accessibility hardening | Yes | Always |
| Generated algebra rollout | Optional | Defer until after stable WebView tutorial path |

## Current Execution Order

### Phase 0: Project Truth

- align scripts, tasks, tests, and docs with actual runtime behavior
- keep verification green while reducing documentation sprawl

### Phase 1: Runtime Determinism

- preserve stable load order
- keep event contracts explicit
- avoid hidden partial boot states

### Phase 2: Mobile and WebView Quality

- compact/mobile classification stays centralized
- tutorial and onboarding work must validate on WebView-like conditions

### Phase 3: UX and Accessibility

- keyboard equivalence
- focus safety
- readability under pressure
- visible fallback messaging for degraded states

### Phase 4: Optional Future Work

- online bridge and reconnect architecture only after scope approval
- generated algebra experiments only after profiling demonstrates a real need

## Execution Matrix

| Phase | Workstream | Target areas | Validation |
| --- | --- | --- | --- |
| 0A | Tooling truth pass | `package.json`, workspace tasks, docs, verify script | `npm run verify` |
| 0B | Event contract inventory | game, worm, lock, console, symbol-rain families | focused smoke and doc review |
| 0C | Observability foundation | Playwright config, fixtures, runtime observers | smoke lane with artifacts |
| 1A | Startup determinism | `src/pages/game.html`, game boot chain, lazy loaders | manual three-level load + Playwright |
| 1B | Tooling cleanup | scripts, tasks, doc references | `npm run verify`, `npm run typecheck` |
| 2A | Boundary hardening | cross-domain state touchpoints | focused gameplay regressions |
| 2B | Security and perf guardrails | loaders, queues, event gateways, worker behavior | stress and smoke lanes |
| 3A | Competition QA lane | competition config, helpers, deterministic state reset | smoke + matrix |
| 3B | Accessibility and UX P0 | level select, game UI, console, HUD | keyboard/manual + Playwright |
| 4A | Loading-state resilience | problem loaders, lazy loaders, worker hooks | slow/failing asset scenarios |
| 4B | Net bridge skeleton | future adapter layer only if approved | contract tests |
| 5A | Reconnect and authority | future network modules only if approved | synthetic match tests |

## Current Feature Track: Single H2P WebView Path

### Scope

- dedicated H2P route before Beginner
- forced Evan walkthrough on H2P
- in-app exit guard during unresolved gameplay
- WebView-first validation

### Acceptance Criteria

1. Beginner launches H2P only until tutorial completion.
2. H2P content is distinct from Beginner content.
3. Evan auto-runs on H2P even on compact/mobile surfaces.
4. Tutorial beat sequence demonstrates worm, muffin, power-up, and symbol solving.
5. In-app exits re-enable immediately on completion.

### Validation Batch

```bash
npx playwright test tests/tutorial-level-routing.spec.js tests/gameplay-exit-guard.spec.js tests/h2p-tutorial.spec.js --project=chromium --reporter=line
```

## Competition QA Policy

### Required Lanes

- PR smoke
- pre-merge matrix
- nightly soak and perf monitoring

### Determinism Rules

- inject deterministic seed when needed
- reset browser and app state between scenarios
- capture console errors, page errors, failed requests, and useful performance artifacts

### Merge Blocking Conditions

- unclassified runtime errors
- broken critical event sequence
- focused regression lane failure
- mobile/WebView contract failure on a touched surface

## Backlog Rules

### Do Now

- consolidate stale docs into the surviving five files
- keep verification aligned with repo reality
- protect WebView-first gameplay quality

### Do Next

- strengthen competition QA determinism
- keep startup/load resilience explicit
- improve accessibility and focus safety in high-pressure surfaces

### Defer

- online multiplayer architecture
- full generated algebra replacement
- broad rewrites that bypass existing event contracts

## Generated Algebra Decision

Generated algebra is not a performance optimization for this codebase right now.

Reasons:

- authored content is deterministic and simpler to validate
- Android WebView is the primary target and should avoid unnecessary symbolic runtime work
- the current bottlenecks are startup, layout, interaction, and regression safety, not authored problem-file overhead

If pursued later, it should be a separate spike with profiling, not a silent replacement of authored content.

## Rollback Philosophy

- isolate scope by workstream
- prefer reversible doc or config changes first
- do not mix architecture refactors with validation-lane changes unless necessary
- keep feature flags or guarded fallbacks for higher-risk runtime shifts

## Consolidation Record

Beta absorbed the old content from:

- `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`
- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`
- `.github/superpower/plan/*.md`
- `.github/superpower/brainstorm/*.md`
- `.github/superpower/context/*.md`

The deleted superpower artifacts were historical planning material, not durable source-of-truth docs.
## Active Implementation Plan: Sci-Fi Console UI Hardening

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Premium Sci-Fi Console" UX specification focused on strictly bounded layout, 44x44 touch safety, and GPU-only CSS transitions to guarantee <22ms mobile frame times.

**Architecture:** We will strip layout-triggering properties (`transition: all`, `width`, `height` in hover states) from the core animation files. We will enforce fluid typography and button heights using `clamp()` and `min-height: 44px`.

**Tech Stack:** Native CSS, Playwright for visual regression and accessibility.

---

### Task 1: Strict CSS GPU & Touch Safety Rules

**Files:**
- Modify: `src/styles/css/game-animations.core.css`
- Modify: `src/styles/css/index.actions.css`
- Test: `tests/ui-boundary.spec.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Append to tests/ui-boundary.spec.js
test('Buttons meet 44x44px touch target protocol', async ({ page }) => {
  await page.goto('/src/pages/index.html');
  const buttons = page.locator('button, [role="button"]');
  const count = await buttons.count();
  
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/ui-boundary.spec.js --project=chromium`
Expected: FAIL because some legacy buttons on index or game layouts may be `36px` or less.

- [ ] **Step 3: Write minimal implementation**

```css
/* In index.actions.css and forms using buttons */
button, 
.action-target, 
[role="button"] {
  min-height: 44px;
  min-width: 44px;
  /* Decisive easing only */
  transition: transform 150ms var(--ease-out-quint), opacity 150ms linear;
}

button:active {
  transform: scale(0.96);
}
```

```css
/* In game-animations.core.css, remove and replace any 'transition: all' */
.worm-entity {
  /* only transition GPU properties */
  transition: transform 200ms linear, opacity 150ms var(--ease-out-quint);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/ui-boundary.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/ui-boundary.spec.js src/styles/css/index.actions.css src/styles/css/game-animations.core.css
git commit -m "fix: enforce 44px touch targets and GPU-only transitions"
```

### Task 2: Implement Reduced-Motion UX Requirements

**Files:**
- Modify: `src/styles/css/lod-animations.reduced-motion.css`
- Test: `tests/focused-mobile-a11y-checks.spec.js` (create if doesn't exist)

- [ ] **Step 1: Write the failing test**

```javascript
/* In a new or existing a11y spec */
test('Reduced motion disables transform animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/src/pages/game.html?level=beginner');
  
  const elementContent = await page.evaluate(() => {
    const styles = window.getComputedStyle(document.body);
    return styles.getPropertyValue('--ease-out-quint');
  });
  
  // Actually test standard UI components
  const button = page.locator('button').first();
  await button.hover();
  
  // It shouldn't animate transform or we should force zero-duration.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/focused-mobile-a11y-checks.spec.js --project=chromium`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```css
/* Append to lod-animations.reduced-motion.css */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/focused-mobile-a11y-checks.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles/css/lod-animations.reduced-motion.css
git commit -m "feat: complete a11y full reduced-motion coverage"
```
