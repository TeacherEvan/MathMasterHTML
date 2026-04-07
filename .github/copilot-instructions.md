# MathMasterHTML Workspace Instructions

This file is the repo-wide routing layer only. Durable runtime, testing, and workflow details belong in `Docs/` and `README.md`.

## Repo-Wide Defaults

- Active runtime pages live in `src/pages/`; root HTML files stay redirect entrypoints.
- Preserve the browser-native HTML/CSS/JS script-tag runtime and event-driven boundaries.
- Treat this as a three-panel system: Panel A is problem display and lock animation, Panel B is steps, worms, console, and HUD, and Panel C is the symbol rain.
- Use `src/scripts/constants.js` and `src/scripts/constants.events.js` instead of ad hoc constants or event names.
- Panel A and Panel B sizing is owned by `src/scripts/display-manager.js`, not CSS overrides.
- Symbol matching is case-insensitive in gameplay logic. Preserve that behavior when touching reveal or validation flows.
- Prefer `pointerdown` over `click`, avoid `transition: all`, and do not add repeated DOM queries inside animation loops.
- Default validation baseline: `npm run verify` and `npm run typecheck`.

## Instruction Architecture

See `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md` for the ownership model and update protocol.

This file stays minimal and repo-wide. It routes agents to the authoritative docs instead of restating subsystem behavior.

## Key References

- `README.md` for repo entrypoints and command overview.
- `Docs/SystemDocs/_INDEX.md` for the current documentation map.
- `Docs/SystemDocs/DEVELOPMENT_GUIDE.md` for workflow and documentation upkeep rules.
- `Docs/SystemDocs/ARCHITECTURE.md` for runtime boundaries and event-driven structure.
- `Docs/SystemDocs/PERFORMANCE.md` for performance constraints and validation targets.
- `Docs/Worms/WORM_DEVELOPER_GUIDE.md` for worm-specific behavior and contracts.
- `Docs/Worms/WORM_TESTING_GUIDE.md` for worm-related test guidance.
- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md` when work touches roadmap or execution-phase scope.
