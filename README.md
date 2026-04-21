# MathMasterHTML

MathMasterHTML is a browser-native algebra training game built around active runtime pages in `src/pages/`. The gameplay runtime is script-tag driven, served over HTTP, and organized around the shared panel and symbol-rain contracts documented in the plan files.

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:8000/game.html?level=beginner` after the server starts.

## Core Pages

- `src/pages/index.html`: main landing page
- `src/pages/level-select.html`: level selection page
- `src/pages/game.html`: active gameplay page

## Runtime Notes

- `src/scripts/display-manager.js` owns panel sizing and compact/mobile classification.
- Problem content lives under `src/assets/problems/Assets/` as runtime JSON.
- `service-worker.js` handles offline and update behavior.
- Use an HTTP server; `file://` is not supported for runtime assets.

## Scripts

- `npm run verify`: repo health and policy checks
- `npm run typecheck`: TypeScript checks for the configured script subset
- `npm test`: full Playwright run
- `npm run test:competition:smoke`: fast competition smoke lane
- `npm run test:perf:gate`: performance smoke gate
- `npm run test:manual`: manual launch reminder for the beginner game page

## Key Docs

- `Plan Genesis.md`: runtime architecture and engineering source of truth
- `Plan Beta.md`: roadmap and execution priorities
- `Plan Alpha.md`: product, UX, and design rules
- `JOBCARD.md`: rolling work log

## Validation

- `npm run verify`
- `npm run typecheck`