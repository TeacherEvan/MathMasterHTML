## Context Map: Design unification pass across welcome, level-select, and gameplay

### Design source of truth

- `task.md` — canonical design context: mobile-first quality bar, level-select as visual benchmark, OKLCH structural tokens, Orbitron display only, Exo 2 body, no HUD overlap.

### Primary files by screen

#### Welcome

- `src/pages/index.html` — structural source for header, hero, CTA group, scoreboard modal.
- `src/styles/css/index.css` — import hub; keep stable unless import order changes.
- `src/styles/css/index.core.css` — page shell, welcome container, global page tokens.
- `src/styles/css/index.hero.css` — title, subtitle, quote, hero rhythm.
- `src/styles/css/index.actions.css` — CTA/button treatment and interaction states.
- `src/styles/css/index.scoreboard.css` — modal shell, summary grid, history list.
- `src/styles/css/index.responsive.css` — mobile stacking and modal responsiveness.
- `src/styles/css/index.responsive.compact.css` — compact viewport overrides.

#### Level select

- `src/pages/level-select.html` — route-card structure and footer/navigation shell.
- `src/styles/css/level-select.css` — import hub.
- `src/styles/css/level-select.polish.css` — canonical visual benchmark and almost all layout/styling.

#### Gameplay

- `src/pages/game.html` — DOM contract for HUD, buttons, panels, modals, console.
- `src/styles/css/game.css` — base three-panel geometry, safe zones, problem/lock positioning.
- `src/styles/css/game-polish.chrome.css` — gameplay polish import hub.
- `src/styles/css/game-polish.chrome.tokens.css` — shared shell tokens and button shell styling.
- `src/styles/css/game-polish.chrome.modal.css` — how-to-play / modal treatment.
- `src/styles/css/game-polish.chrome.playfield.css` — HUD, problem shell, console polish.
- `src/styles/css/score-timer.css` — authoritative HUD grid geometry and reserved power-up zone.
- `src/styles/css/worm-effects.ui.css` — power-up tray base geometry and state styling.
- `src/styles/css/console.css` + `src/styles/css/console.core.css` — console geometry in Panel B.
- `src/styles/css/game-responsive.css` — import hub for responsive gameplay behavior.
- `src/styles/css/game-responsive.mobile-landscape.css` — compact landscape geometry contract.
- Potentially `src/styles/css/game-responsive.mobile-landscape.shallow.css`, `game-responsive.layout.css`, `game-modals.css`, `game-responsive.modals.css` if panel/modal spacing changes propagate.

### Runtime/layout dependencies to watch

#### Welcome dependencies

- `src/scripts/index-page.core.js` — CTA navigation and key handling depend on `#begin-training-button` and scoreboard event flow.
- `src/scripts/index-page.effects.js` — animates `.main-title`, `.subtitle`, `.logo-circle`, CTA.
- `src/scripts/index-page.matrix.js` — depends on `#matrixBg`.
- `src/scripts/index-page.scoreboard.js` and `index-page.scoreboard.render.js` — modal IDs/classes are contract-sensitive; render injects `.scoreboard-level-card`, `.scoreboard-stat-row`, `.scoreboard-history-item`, `.scoreboard-empty-state`.

#### Level-select dependencies

- `src/scripts/level-select-page.interactions.js` — depends on `.level-card`, `.level-button`, `.back-button`.
- `src/scripts/level-select-page.progress.js` — injects scoreboard stats into `.level-stats` and animates `.progress-fill`; card interior spacing must absorb additional stat rows.
- `src/scripts/level-select-page.effects.js` — depends on `#matrixBg`.

#### Gameplay dependencies

- `src/scripts/display-manager.js` — applies inline font sizing to `#problem-container`, `#solution-container`, `#back-button`, `#help-button`. CSS alone cannot fully control those text sizes.
- `src/scripts/display-manager.mobile.js` — overrides gameplay typography again on compact viewports.
- `src/scripts/score-timer.boundary.js` — registers score/timer zones with `uiBoundaryManager`.
- `src/scripts/ui-boundary-manager*.js` — overlap detection and positional constraints for HUD/power-up layout.
- `src/scripts/worm-powerups.ui.js` — computes `--panel-b-top-safe-zone`, tray width/gap/padding variables, and anchors `#power-up-display` relative to HUD/timer/controls.
- `src/scripts/worm-powerups.ui.draggable.js` — validates tray positions against `uiBoundaryManager`.
- `src/scripts/worm-obstacle-map.js` — treats `#game-hud` as obstacle geometry for worms.

### Key ripple effects / risks

#### Layout and responsive behavior

- Gameplay HUD is split across multiple layers: structure in `game.html`, geometry in `score-timer.css`, polish in `game-polish.chrome.playfield.css`, tray geometry in `worm-effects.ui.css`, and runtime positioning in `worm-powerups.ui.js`.
- The known live issue (gameplay logs overlap warnings for score/timer/power-up HUD zones) strongly suggests the highest-risk area is the interaction between `score-timer.css`, `game-polish.chrome.playfield.css`, `worm-effects.ui.css`, `worm-powerups.ui.js`, and `uiBoundaryManager` registrations.
- `#symbol-console` and `.panel-b-controls` are vertically coupled to `--panel-b-top-safe-zone`; moving the tray or HUD can compress controls/console space and break compact/mobile landscape layouts.
- `#problem-container` and `#lock-display` already rely on manually reserved safe zones in `game.css`; HUD height changes can cascade into Panel A overlap regressions.
- Welcome and level-select are lower-risk visually, but both use animation-on-load and responsive stacking that tests assert spatially.

#### Display-manager inline styling

- `display-manager.js` and `display-manager.mobile.js` inject inline typography on gameplay. Any design pass that tries to unify font scale across gameplay must either update those scripts or deliberately avoid CSS-only assumptions for `#problem-container` and `#solution-container`.

#### Event-driven/runtime constraints

- Do not convert page-to-page or gameplay-module coordination into direct module calls; runtime architecture expects DOM events.
- On gameplay, structural changes to IDs/classes that scripts query directly are higher risk than pure style-value changes.
- Power-up selection uses pointer/click handlers on the dynamically created `#power-up-display`; DOM/container changes around that tray need to preserve pointer reachability and `data-layout` behavior.

### Test coverage most likely affected

#### Welcome

- `tests/welcome-page-redesign.spec.js`
- `tests/welcome-page-motion.spec.js`

#### Level select

- `tests/level-select-polish.spec.js`
- `tests/level-select-interactions.spec.js`
- `tests/level-select-scoreboard.spec.js`

#### Gameplay core layout / responsive / HUD

- `tests/ui-boundary.spec.js`
- `tests/game-mobile-layout.spec.js`
- `tests/game-mobile-layout.ultranarrow.spec.js`
- `tests/game-portrait-device-contract.spec.js`
- `tests/powerups.spec.js` (especially mobile tray separation assertions)
- `tests/managers.spec.js` (HUD selectors and timer/score expectations)
- `tests/onboarding-gates.spec.js` if how-to-play modal layout changes
- `tests/startup-preload.spec.js` if preload/modal chrome changes
- `tests/lock-components.spec.js` and `tests/lock-progression-moment.spec.js` if Panel A spacing shifts
- `tests/perf-scenarios.spec.js` / `tests/performance-bench.spec.js` if animation density or layout work increases runtime cost

#### Lowest-risk rerun ladder

1. `tests/welcome-page-redesign.spec.js`
2. `tests/level-select-polish.spec.js`
3. `tests/ui-boundary.spec.js`
4. `tests/game-mobile-layout.spec.js`
5. `tests/game-portrait-device-contract.spec.js`
6. `tests/powerups.spec.js`
7. `npm run test:competition:smoke`

### Suggested implementation sequence

1. **Level-select first as the visual baseline reference** — confirm tokens, spacing, and hierarchy that welcome/gameplay should converge toward.
2. **Welcome second** — it is mostly isolated CSS/HTML, with limited runtime coupling outside CTA and scoreboard modal selectors.
3. **Gameplay shell third, in layers**
   - gameplay tokens / modal shell
   - HUD polish without changing geometry
   - HUD geometry / safe-zone fixes for score/timer/power-up overlap
   - Panel A / Panel B spacing reconciliation
   - compact/mobile-landscape responsive adjustments

### Engineering-risk recommendation

- **Start with level-select** from an engineering-risk perspective.
- Why: it is already the approved aesthetic benchmark, is mostly centralized in `level-select.polish.css`, has lighter runtime coupling than gameplay, and provides concrete tokens/spacing/type decisions before touching the fragile gameplay HUD stack.
- **Do not start with gameplay** unless the immediate goal is to fix the live HUD overlap issue first; gameplay has the most multi-file coupling and the most regression-sensitive tests.
- If the work is split into phases, a practical order is: **level-select baseline → welcome alignment → gameplay HUD/Panel fixes → broader gameplay polish**.

### Breaking-change flags

- Renaming/removing existing IDs or classes in `index.html`, `level-select.html`, or `game.html` will break page scripts and Playwright selectors.
- Changing gameplay HUD geometry without coordinating `worm-powerups.ui.js` and `uiBoundaryManager` risks reintroducing overlap warnings or creating new mobile tray/control collisions.

### Practical note for the live HUD issue

- Treat the gameplay overlap warning as a dedicated sub-lane inside the unification pass, not a side effect to “clean up later.” It has explicit CSS, runtime, and test contracts and is the most likely place for visual polish to create false wins with hidden regressions.
