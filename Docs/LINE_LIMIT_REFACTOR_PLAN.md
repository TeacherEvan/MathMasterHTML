# Line Limit Refactor Plan (Session 1)

## Goal

Refactor one or more monolithic files per session to ensure no file exceeds 500 lines of code, while preserving the event-driven architecture and runtime behavior.

## Scope (Session 2)

Targets:

1. src/scripts/ui-boundary-manager.js (727 lines)
2. src/scripts/lock-manager.js (689 lines)
3. src/styles/css/modern-ux-enhancements.css (510 lines)

## Rationale

- UI boundary management and lock manager exceed 500 LOC and mix core logic with helpers.
- CSS file exceeds 500 LOC due to section headers and verbose comments.
- Splitting and trimming improves cohesion, testability, and maintainability.

## Constraints

- No build tools, no modules. Pure HTML/CSS/JS.
- Inter-module communication must remain event-driven.
- Preserve existing global APIs for backward compatibility.

## Proposed Modular Design

Create small, single-responsibility scripts:

1. ui-boundary-manager.core.js: registration, overlap checks, log helper
2. ui-boundary-manager.positioning.js: safe positioning + reposition logic
3. ui-boundary-manager.monitoring.js: resize + periodic checks
4. ui-boundary-manager.debug.js: validation + debug utilities
5. ui-boundary-manager.js: bootstrap instance
6. lock-manager.loader.js: component loading + normalize naming
7. lock-manager.animations.js: activation + animation helpers
8. lock-manager.js: core event wiring + state + basic lock rendering

CSS:

9. modern-ux-enhancements.css: trim comment-only headers to stay under 500 LOC

## Integration Plan

- Update src/pages/game.html to load new scripts in a safe order:
  ui-boundary-manager.core → ui-boundary-manager.positioning → ui-boundary-manager.monitoring → ui-boundary-manager.debug → ui-boundary-manager
  lock-manager → lock-manager.loader → lock-manager.animations
- Keep global symbols identical to current behavior.

## Testing Plan

- Smoke test in browser: load game page and verify console for errors.
- Verify UIBoundaryManager overlap checks and reposition events still fire.
- Verify lock progression still advances on problem events.
- No automated tests added in this session (documented for later).

## Rollback Plan

- Revert to previous ui-boundary-manager.js and lock-manager.js.
- Restore original script order in src/pages/game.html.

## Scope (Session 3)

Targets:

1. `src/assets/components/lock-components/Line-1-transformer.html`
2. `src/assets/components/lock-components/Line-5-transformer.html`
3. `src/assets/components/lock-components/line-6-transformer.html`

## Rationale

- HTML files contained large inline `<style>` blocks causing them to exceed 500 LOC.
- Separation of CSS improves cacheability and maintainability.

## Execution

- Extracted styles to `src/styles/css/lock-components/`.
- Replaced inline styles with `<link rel="stylesheet">`.
