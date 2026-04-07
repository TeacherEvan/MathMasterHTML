# Development Guide

This guide is the current workflow and conventions reference for MathMasterHTML.

## Repo reality

- Runtime: pure HTML, CSS, and JavaScript in the browser.
- Tooling: `npm` is used for local serving, verification, type-checking, and Playwright runs.
- Entry points: the root HTML files redirect to the active pages in `src/pages/`.
- Architecture style: script-tag/global runtime with DOM events as the inter-module boundary.
- Documentation style: maintain a small living doc set instead of accumulating one-off status reports.

## Core commands

| Command | Purpose |
| --- | --- |
| `npm start` | Serve the app locally on port 8000 |
| `npm run verify` | Project health script (critical files, docs, lint, line-limit baseline) |
| `npm run typecheck` | TypeScript checks for the configured script subset |
| `npm test` | Full Playwright run |
| `npm run test:competition:smoke` | Fast competition smoke lane |
| `npm run test:competition:matrix` | Full competition browser/device matrix |
| `npm run test:competition:full` | Critical + stress competition lane |

## Runtime conventions

### 1. Event-driven integration only

Use DOM events for cross-module communication.

```javascript
document.dispatchEvent(
  new CustomEvent("symbolClicked", {
    detail: { symbol: "x" },
  }),
);
```

Do not replace event boundaries with direct module-to-module calls.

### 2. Keep the split-file structure intact

Large systems are intentionally split by concern:

- `game*.js` for game flow
- `worm-system.*.js` for worm subsystems
- `worm-powerups*.js` for power-up concerns
- `score-timer.*.js` for HUD logic
- `utils-*.js` for shared subsystems like achievements and combos

Additions should follow the existing split convention instead of rebuilding monolith files.

### 3. Respect current UI ownership

- Panel A and B text sizing is controlled by `src/scripts/display-manager.js` via inline styles.
- Problem data comes from `src/assets/problems/**/*.md`.
- Lock visuals are injected from `lock/` HTML fragments.
- Touch-first interactions use `pointerdown`, not delayed `click` handlers.

### 4. Prefer current code over historical docs

Some removed reports captured point-in-time snapshots. When in doubt, verify behavior against `src/scripts/` and update the living docs instead of resurrecting old assumptions.

## Recommended work flow

1. Start the app with `npm start`.
2. Load a concrete URL such as `http://localhost:8000/game.html?level=beginner`.
3. Run `npm run verify` and `npm run typecheck` before and after meaningful changes.
4. Add targeted Playwright coverage for behavior changes.
5. Update the relevant living docs if behavior, file structure, or developer workflow changed.

## Debugging checklist

- Press `P` to toggle the in-game performance monitor.
- Check the browser console for module-specific emoji/log prefixes.
- Use `window.performanceMonitor.getSnapshot()` for structured metrics.
- Reproduce issues on a local HTTP server, never on `file://`.
- Verify load order issues in `src/pages/game.html` before suspecting gameplay logic.

## Documentation ownership

Use these files as the source of truth:

- Architecture: `Docs/SystemDocs/ARCHITECTURE.md`
- Workflow/conventions: `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- Performance: `Docs/SystemDocs/PERFORMANCE.md`
- Historical context: `Docs/SystemDocs/REFACTORING_HISTORY.md`
- Worm specifics: `Docs/Worms/WORM_DEVELOPER_GUIDE.md` and `Docs/Worms/WORM_TESTING_GUIDE.md`
- Recent noteworthy work: `JOBCARD.md`

Avoid creating new completion reports, audit summaries, or plan markdown unless the document will remain a durable part of the living set.

## Agent customization upkeep

Treat `.github/copilot-instructions.md` as a minimal repo-wide routing layer, not a second source of truth for runtime or testing rules. When upkeep changes affect ownership or instruction layering, update the durable docs first and use `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md` as the reference for the routing model and update protocol.
