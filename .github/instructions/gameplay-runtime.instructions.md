---
description: "Use when editing MathMasterHTML runtime gameplay scripts or page entrypoints. Thin wrapper for src/scripts and src/pages runtime work."
name: "Gameplay Runtime Guidelines"
applyTo: "src/scripts/**/*.js, src/pages/**/*.html"
---
# Gameplay Runtime Guidelines

## Non-Negotiables

- Edit the active runtime pages in `src/pages/`; root HTML files remain redirect entrypoints.
- Preserve the browser-native script-tag runtime and event-driven module boundaries.
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