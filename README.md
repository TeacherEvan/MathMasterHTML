# Math Master - Unlock Your Mind

Math Master is a browser-native algebra game with a Matrix-inspired presentation. Players solve equations by clicking falling symbols, revealing each solution line step by step while managing worms, power-ups, score decay, and lock progression.

## Current highlights

- Three-panel gameplay:
  - Panel A: problem text and progressive lock animation
  - Panel B: revealed solution steps, worms, console interactions, and reward popups
  - Panel C: falling symbol rain
- Three difficulty levels with different worm speed and roam timings
- Event-driven gameplay built on DOM `CustomEvent` contracts
- Score/timer HUD with persisted local profile and scoreboard data
- Playwright automation for browser, mobile, competition, and performance checks
- Polished welcome and level-select flows backed by focused interaction, layout, boundary, and reduced-motion coverage

## Quick start

```bash
npm install
npm start
```

Then open one of these URLs:

- `http://localhost:8000/`
- `http://localhost:8000/game.html?level=beginner`
- `http://localhost:8000/src/pages/game.html?level=beginner`

Use an HTTP server for local development. Problem data and UI fragments are fetched at runtime, so `file://` breaks loading.

The repository keeps redirect entrypoints at the root, but the active runtime pages live in `src/pages/`.

## Validation commands

```bash
npm run verify
npm run typecheck
npm test
npm run test:competition:smoke
npm run test:competition:matrix
npm run test:competition:full
```

Useful focused checks:

```bash
npx playwright test tests/worm-rewards.spec.js tests/timer.spec.js --project=chromium
npx playwright test tests/performance-bench.spec.js --project=chromium
npx playwright test tests/perf-scenarios.spec.js --project=chromium --project=pixel-7
npx playwright test tests/game-mobile-layout.spec.js tests/welcome-page-redesign.spec.js tests/welcome-page-motion.spec.js tests/level-select-scoreboard.spec.js tests/level-select-polish.spec.js tests/level-select-interactions.spec.js tests/ui-boundary.spec.js
```

## How to play

1. Start a level and read the algebra problem in Panel A.
2. Click matching falling symbols in Panel C to reveal the active solution line in Panel B.
3. Complete a line to advance the lock sequence and increase worm pressure.
4. Tap green worms to destroy them. Purple worms are different: direct clicks clone them, and the correct kill path is clicking the matching rain symbol.
5. Use the console grid and power-ups to manage difficult situations.
6. Collect muffin rewards after worm explosions to bank bonus points.
7. Finish the problem to persist score and progression locally.

## Deployment

Math Master is a static site at runtime. There is no bundling or build step required for deployment.

Good deployment targets:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any static file host that serves the repository contents over HTTP(S)

For local QA, keep using `npm start` (or another simple HTTP server) instead of opening files directly.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/pages/` | Active HTML entrypoints |
| `src/scripts/` | Runtime JavaScript modules |
| `src/styles/` | CSS modules and polish layers |
| `src/assets/` | Problem data, images, and injected HTML fragments |
| `tests/` | Playwright E2E, performance, integration, and unit-style tests |
| `Docs/` | Living project documentation |
| `.github/copilot-instructions.md` | Canonical agent-specific repository guidance |

## Documentation

Start with `Docs/SystemDocs/_INDEX.md`. The trimmed documentation set is:

- `Docs/SystemDocs/ARCHITECTURE.md`
- `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- `Docs/SystemDocs/PERFORMANCE.md`
- `Docs/SystemDocs/REFACTORING_HISTORY.md`
- `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
- `Docs/Worms/WORM_TESTING_GUIDE.md`
- `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`
- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`
- `JOBCARD.md`

Historical reports, one-off audits, and stale plans were consolidated into the living docs above.

## License

MIT
