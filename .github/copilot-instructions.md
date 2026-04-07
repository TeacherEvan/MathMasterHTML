# Math Master Algebra - AI Agent Instructions

This file is the repo-wide routing layer only. Durable runtime, testing, and workflow details belong in `Docs/` and `README.md`.

## Repo-Wide Defaults

- Active runtime pages live in `src/pages/`; root HTML files stay redirect entrypoints.
- Preserve the browser-native script-tag runtime boundaries.
- Panel A and Panel B sizing is owned by `src/scripts/display-manager.js`, not CSS overrides.
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
