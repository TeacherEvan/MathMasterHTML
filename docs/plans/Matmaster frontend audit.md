# PLASTIC_SURGERY_EXECUTION_PLAN.md — MathMasterHTML Visual & Rendering Overhaul

## 1. Alignment & Target Specification Lock

- **1. Platform:** **Both (Mobile Touch + Desktop Pointer Hybrid)**
  - Touch targets `>= 44x44 CSS px` (`touch-action: manipulation`), hover effects strictly gated behind `@media (hover: hover) and (pointer: fine)` to eliminate sticky touch hover states on mobile, and desktop keyboard focus rings (`2px` solid + `3px` offset).
- **2. Deployment:** **Commercial Public PWA**
  - Strict WCAG AA (`>= 4.5:1`) body contrast and WCAG AAA (`>= 7.0:1`) HUD telemetry contrast, zero layout shift (`CLS = 0.00`), high-DPI crispness, and low-end mobile GPU protection via `data-quality-tier="low" | "medium" | "high"`.
- **3. Audience:** **All Audiences (Accessible Operator Dossier & Cosmic Arcade)**
  - Warm phosphor-brass and cosmic-cyan operator aesthetic on deep obsidian/forest slate (`#111714` / `oklch(0.12 0.014 122)`), celebratory spring micro-interactions, approachable tactile keycaps, and crystal-clear algebra/telemetry legibility.

### Immutable Test & Contract Guardrails (DO NOT VIOLATE)
1. **Line-Limit Policy (`src/tools/scripts/line-limit.config.js`):** Keep all files under 300 lines (or do not add new files over 300 lines; when editing baseline files over 300 lines, replace rules in-place without increasing net line count).
2. **Locked Test Values:**
   - Never change `<meta name="theme-color" content="#111714">` in `src/pages/index.html` or `src/pages/level-select.html` (`tests/welcome-page-redesign.spec.js`).
   - Never change `--cosmic-signal: #5BE3C9;` in `:root` (`tests/cosmic-console-toggle.spec.js`).
   - Never change resting `.level-card` transform away from identity (`scale(1) translate(0, 0)`) or shrink card action buttons below `120px` width (`tests/level-select-polish.spec.js`).
   - Never alter `.hud-block` `min-width: 120px; max-width: 160px;` or `.game-hud` grid areas (`tests/ui-boundary.spec.js`, `tests/hud-mobile-viewport.spec.js`).
3. **Dual-File Sync Rule:** Whenever you modify a split CSS module, you MUST apply the exact same edit to its corresponding monolithic bundle file (`index.css`, `level-select.polish.css`, `game-polish.chrome.css`, `modern-ux-enhancements.css`, `lod-animations.css`, `worm-effects.css`).

---

## 2. Phase-by-Phase Surgical Implementation Tasks

### Task 1: Eliminate All 8 Layout-Thrashing Transitions (Compositor-Only Motion)

**Why:** Animating `width`, `left`, and `top` triggers main-thread style+layout+paint recalculations every frame (16.67ms budget killer on mobile). Convert all 8 instances to GPU-composited `transform: translate3d()` / `scaleX()`.

#### 1A. Preload Progress Bar (`src/styles/css/game-modals.preload.css:41-49`)
- **Current (`lines 41-49`):**
  ```css
  #startup-preload-progress::after {
      content: '';
      position: absolute;
      inset: 0;
      width: var(--progress, 0%);
      background: linear-gradient(90deg, #00ffff, #ffd700);
      border-radius: 3px;
      transition: width 0.3s ease;
  }
  ```
- **Replace With (In-place, same line count):**
  ```css
  #startup-preload-progress::after {
      content: '';
      position: absolute;
      inset: 0;
      width: 100%;
      background: linear-gradient(90deg, #00ffff, #ffd700);
      border-radius: 3px;
      transform-origin: left center;
      transform: scaleX(calc(var(--progress-ratio, 0)));
      transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  ```
  *(Note: In `src/scripts/startup-preload.js`, keep `--progress` for backward compatibility and also set `--progress-ratio: (percent / 100)` on `#startup-preload-progress`, OR if JS sets inline `width`, keep `width: var(--progress, 0%)` and change `transition: width 0.3s ease;` to `transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;`).*

#### 1B. Level Card Specular Sweep (`src/styles/css/level-select.cards.css:34-52` AND `src/styles/css/level-select.polish.css`)
- **Current (`level-select.cards.css:34-52`):**
  Uses `left: -100%` and `transition: left 0.5s ease;` with `.level-card:hover::before { left: 100%; }`.
- **Replace With Compositor Transform:**
  ```css
  .level-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.12),
      transparent
    );
    transform: translate3d(-100%, 0, 0);
    transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  @media (hover: hover) and (pointer: fine) {
    .level-card:hover::before {
      transform: translate3d(100%, 0, 0);
    }
  }
  ```

#### 1C. Modern UX Button Shimmer, Progress Fill & Skip Link
Apply to **both** the modular files (`src/styles/css/modern-ux-enhancements.core.css` & `src/styles/css/modern-ux-enhancements.interactions.css`) **and** the hub (`src/styles/css/modern-ux-enhancements.css`):
1. **`.modern-button::before` (`core.css:146-164` & `modern-ux-enhancements.css:146-164`):**
   Replace `left: -100%` / `transition: left 0.5s` / `left: 100%` with `transform: translate3d(-100%, 0, 0)` / `transition: transform 450ms cubic-bezier(0.22, 1, 0.36, 1)` / `transform: translate3d(100%, 0, 0)`.
2. **`.progress-bar-fill` (`core.css:227-234` & `modern-ux-enhancements.css:227-234`):**
   Remove `will-change: width;` and replace `transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);` with `transform-origin: left center; transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);`.
3. **`.skip-link` (`interactions.css:109-126` & `modern-ux-enhancements.css:514-531`):**
   Replace `top: -100px; transition: top 0.3s;` and `.skip-link:focus { top: 0; }` with `top: 0; transform: translate3d(0, -120%, 0); transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);` and `.skip-link:focus { transform: translate3d(0, 0, 0); }`.

---

### Task 2: VRAM & GPU Layer Hygiene (Purge Invalid `will-change` Declarations)

**Why:** Browser compositors only accelerate `transform`, `opacity`, and `filter`. Declaring `will-change: box-shadow`, `will-change: text-shadow, background-color`, or `will-change: width` wastes GPU texture memory and causes layer explosion on mobile devices.

1. **`src/styles/css/score-timer.css` (`lines 55` and `110`):**
   - Change `will-change: transform, box-shadow, border-color, color;` -> `will-change: transform;` on `.hud-block` and `.timer-display`.
2. **`src/styles/css/game-effects.css` (`lines 87, 126`) & `src/styles/css/game.css` (`line 206`):**
   - Change `will-change: transform, opacity, text-shadow, background-color;` and `will-change: translate, transform, color, text-shadow;` -> `will-change: transform, opacity;`.
3. **`src/styles/css/modern-ux-enhancements.core.css`, `.interactions.css`, and `modern-ux-enhancements.css`:**
   - Remove `will-change: background-position;` (`line 11`), `will-change: box-shadow;` (`line 131` & `interactions.css:43`), `will-change: backdrop-filter, opacity;` (`line 175`), `will-change: width;` (`line 233`), and `will-change: transform, text-shadow, color;` (`line 272`).
   - Replace `backdrop-fade-in` keyframes (`lines 184-193`) so it animates **only `opacity: 0` to `opacity: 1`** while keeping `backdrop-filter: blur(8px)` static (animating `backdrop-filter` radius from `0px` to `8px` re-rasterizes the Gaussian blur kernel on every single frame).
4. **Low-Tier LOD Override (`src/styles/css/lod-animations.tiers.css` & `src/styles/css/lod-animations.css`):**
   - Ensure `[data-quality-tier="low"] *` sets `backdrop-filter: none !important; -webkit-backdrop-filter: none !important; will-change: auto !important;` so low-end mobile devices run at a locked 60 FPS.

---

### Task 3: Six-State Tactile Button & Keypad Mechanics (`<= 16ms` Input-to-Photon Snap)

**Why:** Commercial all-audience polish requires immediate physical feedback on touch and pointer devices without sticky hover states on mobile.

#### 3A. Shared Button Tiers (`src/styles/css/buttons.tiers.css` AND `src/styles/css/index.css:12-270`)
1. Add `touch-action: manipulation;` and `-webkit-tap-highlight-color: transparent;` to `.btn, button.btn, a.btn` and `.icon-button`.
2. Add instant `<= 16ms` active press compression (`transition-duration: 25ms` on `:active`):
   ```css
   .btn:active:not(:disabled):not([aria-disabled="true"]),
   .icon-button:active:not(:disabled) {
     transition-duration: 25ms;
     transform: translate3d(0, 1px, 0) scale(0.975);
   }
   ```
3. Scope `:hover` elevation lifts (`transform: translate3d(0, -1px, 0)`) inside `@media (hover: hover) and (pointer: fine)` while keeping `:focus-visible` active across all input modalities.

#### 3B. Gameplay Chrome & 3x3 Symbol Console Keypad (`src/styles/css/console.core.css`, `src/styles/css/console.css`, `src/styles/css/game-polish.chrome.controls.css`, `src/styles/css/game-polish.chrome.tokens.css`, and `src/styles/css/game-polish.chrome.css`)
1. In `console.core.css` and `console.css` (`.console-slot`):
   - Add `font-variant-numeric: tabular-nums;` and `user-select: none;`.
   - Upgrade `.console-slot` resting state with a crisp top specular bevel:
     `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 4px 12px rgba(0, 0, 0, 0.45);`
   - Upgrade `.console-slot:active` to snap in `25ms`:
     ```css
     .console-slot:active {
       transition-duration: 25ms;
       transform: translate3d(0, 1.5px, 0) scale(0.96);
       box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.65), 0 0 12px rgba(91, 227, 201, 0.35);
     }
     ```
2. In `game-polish.chrome.tokens.css` (`lines 125-145`) and `game-polish.chrome.css`:
   - Add `touch-action: manipulation;` to `#back-button, #audio-toggle, #help-button, #clarify-button, .start-game-button`.
   - Set `:active` `transition-duration: 25ms;` with `transform: translate3d(0, 1px, 0) scale(0.982);`.

---

### Task 4: Zero Numeric Jitter (`tabular-nums`) Across HUD, Scoreboard & Life-Stats Dashboard

**Why:** Live timers, score popups, combo multipliers, and financial/tax metrics jitter horizontally when proportional digit widths (`1` vs `8`) change at 60 Hz.

1. **Gameplay HUD (`src/styles/css/score-timer.css:76-80`):**
   ```css
   .hud-value {
     font-size: 20px;
     font-weight: 900;
     line-height: 1.05;
     font-variant-numeric: tabular-nums;
     font-feature-settings: "tnum" 1;
   }
   ```
2. **Welcome Scoreboard (`src/styles/css/index.scoreboard.css` AND `src/styles/css/index.css`):**
   - Add `font-variant-numeric: tabular-nums;` to `.scoreboard-modal-content` and all score/rank/streak cells.
3. **Life-Stats Telemetry & Tax Dashboard (`src/styles/life-stats.css`):**
   - Upgrade `.ls-card`, `.ls-chart-card`, and `.ls-btn` (`lines 52-122`) to match the commercial operator-console aesthetic while keeping total lines `< 280`:
     - Add `font-variant-numeric: tabular-nums;` to `.ls-card .value`, `.ls-card .delta`, and `.ls-card .sub`.
     - Add `min-width: 0;` to `.ls-card` and `.ls-chart-card` to prevent CSS Grid blowout on narrow mobile viewports.
     - Upgrade `.ls-card` and `.ls-chart-card` depth with `box-shadow: inset 0 1px 0 rgba(216, 255, 230, 0.08), 0 10px 24px rgba(0, 0, 0, 0.35);`.
     - Upgrade `.ls-btn` with `min-height: 40px; touch-action: manipulation;`, `140ms cubic-bezier(0.22, 1, 0.36, 1)` transform/shadow transitions, and a `25ms` `:active` press state (`transform: translate3d(0, 1px, 0) scale(0.98)`).
     - Add `@media (prefers-reduced-motion: reduce)` guard at the bottom of `src/styles/life-stats.css`.

---

### Task 5: Render-Loop & Ambient Motion Smoothness (`index-page.matrix.js` & `level-select-page.effects.js`)

1. **Matrix Rain Column Cap & Reduced-Motion Guard (`src/scripts/index-page.matrix.js`):**
   - Check `window.matchMedia("(prefers-reduced-motion: reduce)").matches` inside `createMatrixRain()`—if true, render at most `Math.min(columns, 12)` static columns with `animationPlayState = "paused"`.
   - Cap maximum DOM columns on ultra-wide 4K desktops (`Math.min(Math.floor(window.innerWidth / CONFIG.COLUMN_WIDTH_PX), 96)`) and add `contain: strict;` on `.matrix-bg` (`src/styles/css/index.matrix.css` & `index.css`) so off-screen falling glyph columns never trigger parent layout/paint invalidation.
2. **Cursor-Tracked Card Spotlight (`src/styles/css/level-select.polish.css`):**
   - Ensure any hover/pointer glow on `.level-card` is gated by `@media (hover: hover) and (pointer: fine)` and never modifies the resting `transform` matrix verified by `waitForCardsToSettle()` in `tests/level-select-polish.spec.js`.

---

## 3. Mandatory Verification & Sign-Off Sequence

After applying Tasks 1–5, execute these commands in sequence. Every single check must pass with exit code `0`:

```bash
# 1. Verify no new file line-limit violations (300-line cap) and all critical files/SW assets exist
npm run verify

# 2. Run ESLint and TypeScript typechecking
npm run lint
npm run typecheck

# 3. Verify Welcome, Level Select, Cosmic Console & Life-Stats UI contracts
npx playwright test tests/welcome-page-redesign.spec.js tests/welcome-page-motion.spec.js tests/welcome-scoreboard.spec.js tests/level-select-polish.spec.js tests/level-select-interactions.spec.js tests/cosmic-console-toggle.spec.js tests/life-stats.spec.js

# 4. Verify Gameplay HUD, Mobile Portrait/Landscape Contracts & UI Boundaries
npx playwright test tests/ui-boundary.spec.js tests/hud-mobile-viewport.spec.js tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js tests/game-portrait-device-contract.spec.js

# 5. Run Performance Smoke Gate
npm run test:perf:gate
```
