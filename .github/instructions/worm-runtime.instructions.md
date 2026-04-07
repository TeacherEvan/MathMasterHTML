---
description: "Use when editing MathMasterHTML worm runtime scripts or worm-related CSS. Thin wrapper for worm runtime guardrails, source docs, and validation."
name: "Worm Runtime Guidelines"
applyTo: "src/scripts/worm*.js, src/scripts/worm/**/*.js, src/styles/**/*worm*.css"
---
# Worm Runtime Guidelines

## Non-Negotiables

- Preserve event-driven worm runtime boundaries and existing split-by-concern files.
- Keep purple worm interaction, direct-click penalties, and reward idempotency aligned with the authoritative worm docs.
- Treat worm event payloads and timing as contracts, and preserve webdriver stability safeguards used by Playwright.
- Keep worm CSS changes minimal and behavior-safe so hit targets, timing-sensitive states, and animations stay intact.
- Keep this wrapper thin; worm behavior and testing detail belong in the primary sources below.

## Primary Sources

- `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
- `Docs/Worms/WORM_TESTING_GUIDE.md`
- `Docs/SystemDocs/PERFORMANCE.md`

## Validate

- `npm run verify`
- `npm run typecheck`
- Run the relevant focused worm Playwright lane described in `Docs/Worms/WORM_TESTING_GUIDE.md`.
