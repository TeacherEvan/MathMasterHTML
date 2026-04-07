# Documentation Index

This repository now keeps a small living documentation set. Historical reports, stale plans, and duplicate summaries were folded into the files below during the 2026-03 documentation spring clean.

## Start here

| Need | Primary file |
| --- | --- |
| Project overview and quick start | [`../../README.md`](../../README.md) |
| Active development workflow | [`./DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) |
| Runtime architecture and event flow | [`./ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Performance instrumentation and rules | [`./PERFORMANCE.md`](./PERFORMANCE.md) |
| Consolidated historical context | [`./REFACTORING_HISTORY.md`](./REFACTORING_HISTORY.md) |
| Worm implementation details | [`../Worms/WORM_DEVELOPER_GUIDE.md`](../Worms/WORM_DEVELOPER_GUIDE.md) |
| Worm validation and regression checks | [`../Worms/WORM_TESTING_GUIDE.md`](../Worms/WORM_TESTING_GUIDE.md) |
| Competition planning | [`../COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`](../COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md) |
| Competition execution order | [`../COMPETITION_PHASE1_EXECUTION_MATRIX.md`](../COMPETITION_PHASE1_EXECUTION_MATRIX.md) |
| Agent customization ownership and update protocol for docs/instructions structure changes | [`./AGENT_CUSTOMIZATION_ARCHITECTURE.md`](./AGENT_CUSTOMIZATION_ARCHITECTURE.md) |
| Rolling work log | [`../../JOBCARD.md`](../../JOBCARD.md) |

## Suggested reading order

1. `README.md`
2. `DEVELOPMENT_GUIDE.md`
3. `ARCHITECTURE.md`
4. Area-specific guide (`WORM_DEVELOPER_GUIDE.md`, `PERFORMANCE.md`, competition docs)
5. `AGENT_CUSTOMIZATION_ARCHITECTURE.md` when you are changing agent customization ownership, instruction layering, or docs structure
6. `REFACTORING_HISTORY.md` when you need historical context rather than current rules

## Documentation rules

- Prefer updating an existing living doc over creating a one-off report.
- Put durable historical context in `REFACTORING_HISTORY.md`.
- Keep `JOBCARD.md` for recent noteworthy work, not full technical design dumps.
- Treat `src/assets/problems/**/*.md` as gameplay data, not developer documentation.
- Keep workflow/config Markdown such as `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, and `.github/superpower/**/*.md` separate from system docs and out of the primary docs catalog.
