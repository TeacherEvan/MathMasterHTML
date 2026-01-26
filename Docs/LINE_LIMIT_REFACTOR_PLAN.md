# Line Limit Refactor Plan (Session 1)

## Goal

Refactor one monolithic file per session to ensure no file exceeds 500 lines of code, while preserving the event-driven architecture and runtime behavior.

## Scope (Session 1)

Target: src/scripts/utils.js (841 lines)

## Rationale

- Large utility module mixes unrelated concerns (core helpers, logging, resources, combo system, achievements).
- Splitting improves cohesion, testability, and maintainability.

## Constraints

- No build tools, no modules. Pure HTML/CSS/JS.
- Inter-module communication must remain event-driven.
- Preserve existing global APIs for backward compatibility.

## Proposed Modular Design

Create small, single-responsibility scripts:

1. utils-core.js: normalizeSymbol, calculateDistance, generateUniqueId, getLevelFromURL, deferExecution
2. utils-dom.js: createDOMElement
3. utils-logging.js: Logger
4. utils-resource-manager.js: ResourceManager
5. utils-combo.js: ComboSystem
6. utils-achievements.js: AchievementSystem
7. utils.js: compatibility shim (minimal, < 500 lines)

## Integration Plan

- Update src/pages/game.html to load new scripts in a safe order:
  utils-core → utils-dom → utils-logging → utils-resource-manager → utils-combo → utils-achievements → utils
- Keep global symbols identical to current behavior.

## Testing Plan

- Smoke test in browser: load game page and verify console for errors.
- Check that combo and achievement events still dispatch.
- Confirm ResourceManager cleanup on beforeunload.
- No automated tests added in this session (documented for later).

## Rollback Plan

- Revert to previous utils.js and restore original script tag in game.html.
