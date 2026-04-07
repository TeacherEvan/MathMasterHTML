---
description: "Use when editing MathMasterHTML runtime gameplay scripts or page entrypoints. Thin wrapper for runtime guardrails, source docs, and validation."
name: "Gameplay Runtime Guidelines"
applyTo: "src/scripts/**/*.js, src/pages/**/*.html"
---
# Gameplay Runtime Guidelines

## Non-Negotiables

- Edit the active runtime pages in `src/pages/`; root HTML files remain redirect entrypoints.
- Preserve the browser-native script-tag runtime, `window.*` globals, and event-driven module boundaries.
- Add or update shared event names in `src/scripts/constants.events.js`, and keep event payload shapes stable.
- If a runtime change adds or moves scripts, preserve dependency order in `src/pages/game.html` and keep downstream `window.*` exports stable.
- For Panel A or Panel B sizing work, change `src/scripts/display-manager.js` rather than trying to override inline sizing from CSS.
- Keep this wrapper thin; durable runtime behavior belongs in the primary sources below.

## Primary Sources

- `Docs/SystemDocs/ARCHITECTURE.md`
- `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- `Docs/SystemDocs/PERFORMANCE.md`
- `Docs/Worms/WORM_DEVELOPER_GUIDE.md` when gameplay work touches worms

## Validate

- `npm run verify`
- `npm run typecheck`
- Run the relevant focused Playwright lane when behavior changes.
