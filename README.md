# Math Master

Math Master is a browser-native algebra game. This README is the repository entrypoint: it covers local startup, validation, the main runtime entrypoints, and where the durable docs live.

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

Focused Playwright lanes and subsystem-specific checks live in the docs index and the relevant subsystem guides.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/pages/` | Active HTML entrypoints |
| `src/scripts/` | Runtime JavaScript modules |
| `src/styles/` | CSS modules and polish layers |
| `src/assets/` | Problem data, images, and injected HTML fragments |
| `tests/` | Playwright E2E, performance, integration, and unit-style tests |
| `Docs/` | Living project documentation |
| `.github/copilot-instructions.md` | Repo-wide agent routing and reminder layer that points to authoritative docs |

## Living docs

- Start with `Docs/SystemDocs/_INDEX.md` for the current documentation map and reading order.
- Use `Docs/SystemDocs/ARCHITECTURE.md` for runtime entrypoints, event flow, and module boundaries.
- Use `Docs/SystemDocs/DEVELOPMENT_GUIDE.md` for workflow and maintenance expectations.
- Use `Docs/SystemDocs/PERFORMANCE.md` for performance rules and validation targets.
- Use `Docs/Worms/WORM_DEVELOPER_GUIDE.md` and `Docs/Worms/WORM_TESTING_GUIDE.md` for worm behavior and worm-specific regression coverage.
- Use `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md` for agent customization ownership and wrapper/update protocol.

## License

MIT
