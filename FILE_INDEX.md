# File Index

This is the living repository map for MathMasterHTML. Historical reports, one-off audits, and stale plans were consolidated into the core documentation set instead of being maintained as parallel Markdown tracks.

## Top-level files

| Path | Purpose |
| --- | --- |
| `README.md` | Project overview, quick start, deployment notes, and doc map |
| `JOBCARD.md` | Rolling project log for noteworthy work |
| `package.json` | Local run, verify, typecheck, and Playwright commands |
| `playwright.config.js` | Main Playwright configuration |
| `playwright.competition.config.js` | Competition smoke/matrix/full lanes |
| `.github/copilot-instructions.md` | Canonical repository guidance for AI agents |
| `REFACTORING_PLAN.csv` | Large-file split catalog and refactor reference |

## Runtime entrypoints

| Path | Role |
| --- | --- |
| `index.html` | Root redirect to `src/pages/index.html` |
| `game.html` | Root redirect to `src/pages/game.html` |
| `level-select.html` | Root redirect to `src/pages/level-select.html` |
| `src/pages/index.html` | Actual landing page |
| `src/pages/game.html` | Actual game runtime page |
| `src/pages/level-select.html` | Actual level-select page |

## Runtime script families

| Area | Key files |
| --- | --- |
| Game flow | `src/scripts/game*.js`, `src/scripts/game-init.js`, `src/scripts/game-page.js` |
| Symbol rain | `src/scripts/3rdDISPLAY.js`, `src/scripts/symbol-rain*.js` |
| Worm system | `src/scripts/worm.js`, `src/scripts/worm-system.*.js`, `src/scripts/worm-powerups*.js`, `src/scripts/worm-system.rewards.muffin.js` |
| Lock progression | `src/scripts/lock-manager*.js`, `lock/` |
| Score/timer HUD | `src/scripts/score-timer-manager.js`, `src/scripts/score-timer.*.js` |
| Local persistence | `src/scripts/player-storage.js`, `src/scripts/player-storage.helpers.js` |
| Performance/quality | `src/scripts/performance-monitor*.js`, `src/scripts/dynamic-quality-adjuster.js`, `src/scripts/quality-tier-manager*.js` |
| Shared constants/utilities | `src/scripts/constants*.js`, `src/scripts/utils*.js` |

## Styles

| Path | Purpose |
| --- | --- |
| `src/styles/` | Primary CSS source tree |
| `src/styles/css/` | Split CSS modules and polish layers |
| `style.css` | Root redirect/static compatibility stylesheet |

## Tests

| Path | Coverage |
| --- | --- |
| `tests/*.spec.js` | Main Playwright E2E and regression specs |
| `tests/performance/*.spec.js` | Performance micro-benchmarks |
| `tests/integration/*.spec.js` | Integration-style movement/navigation specs |
| `tests/unit/*.spec.js` | Unit-style logic tests |
| `tests/utils/` | Shared Playwright helpers and scenario drivers |

## Documentation

| Path | Purpose |
| --- | --- |
| `Docs/SystemDocs/_INDEX.md` | Documentation hub |
| `Docs/SystemDocs/ARCHITECTURE.md` | Runtime architecture and event flow |
| `Docs/SystemDocs/DEVELOPMENT_GUIDE.md` | Setup, conventions, and validation workflow |
| `Docs/SystemDocs/PERFORMANCE.md` | Performance instrumentation and optimization rules |
| `Docs/SystemDocs/REFACTORING_HISTORY.md` | Consolidated historical context |
| `Docs/Worms/WORM_DEVELOPER_GUIDE.md` | Current worm-system developer reference |
| `Docs/Worms/WORM_TESTING_GUIDE.md` | Current worm-system testing guide |
| `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md` | Competition productionization strategy |
| `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md` | File-targeted competition execution plan |

## Data and workflow Markdown

- `src/assets/problems/**/*.md` are gameplay data files, not developer documentation.
- `.github/superpower/**/*.md` are workflow artifacts for planning/brainstorming and were left outside the documentation consolidation.
- `.github/copilot-instructions.md` is configuration/reference guidance, not a status report.
