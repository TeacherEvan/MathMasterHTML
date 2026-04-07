---
description: "Use when editing MathMasterHTML Playwright specs. Thin wrapper for test-surface guardrails and validation."
name: "Playwright Test Guidelines"
applyTo: "tests/**/*.spec.js"
---
# Playwright Test Guidelines

## Non-Negotiables

- Target the real browser runtime: active pages live in `src/pages/`, while root pages stay redirect entrypoints unless the redirect itself is under test.
- Keep tests aligned with documented event-driven behavior and visible runtime outcomes instead of private implementation details.
- Keep this wrapper thin; durable test behavior, lane guidance, and scenario detail belong in the primary sources below.

## Primary Sources

- `README.md`
- `Docs/SystemDocs/_INDEX.md`
- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
- `Docs/SystemDocs/ARCHITECTURE.md`
- `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- `Docs/SystemDocs/PERFORMANCE.md`
- `Docs/Worms/WORM_TESTING_GUIDE.md` when the change touches worms

## Validate

- `npm run verify`
- `npm run typecheck`
- Run the relevant focused Playwright lane for the changed surface.