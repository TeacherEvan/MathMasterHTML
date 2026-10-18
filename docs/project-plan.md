# MathMasterHTML — Project Plan

This file is the consolidated project plan and single entry point for repository documentation. It synthesizes the three canonical plan files and points to every maintained doc surface. It does not replace the plan files; it indexes them.

## Canonical plan files

| Plan | Role | Source of truth for |
|------|------|---------------------|
| `Plan Genesis.md` | Engineering source of truth | Runtime architecture, boot sequence, three-panel contracts, module families, performance rules, gameplay integrity, settings/update model, development rules |
| `Plan Beta.md` | Roadmap and execution | Active product priorities, decision gates, execution matrix, competition QA policy, active feature tracks, backlog rules, generated-algebra decision, rollback philosophy |
| `Plan Alpha.md` | Product, UX, and design | Users, product job, emotional arc, brand personality, design direction, color/typography/motion/layout rules, accessibility, content messaging, welcome-surface contract |
| `JOBCARD.md` | Rolling work log | Dated implementation history and verification results |

All four files live at the repository root. The consolidation record inside each plan lists the older `Docs/*` files it absorbed.

## Repository reality

- Browser-native HTML/CSS/JavaScript; script-tag runtime with `window.*` globals and DOM events.
- Active entrypoints in `src/pages/`; root HTML files are redirect-only entrypoints.
- Tooling: npm, Playwright, ESLint, TypeScript typecheck, and the repo verify script (`src/tools/scripts/verify.js`).
- Problem content is runtime JSON under `src/assets/problems/Assets/`.
- Node engine: `^24.0.0` (see `.nvmrc` and `package.json` `engines`).

## Key docs

| Doc | Location | Purpose |
|-----|----------|---------|
| Project plan (this file) | `docs/project-plan.md` | Consolidated plan entry point and doc index |
| README | `README.md` | Quick start, core pages, runtime notes, scripts, validation |
| Security | `docs/SECURITY.md` | Canonical output-escaping rule (`window.DomSanitizer.escapeHTML`) |
| Surgical audit | `docs/plans/SurgicalAudit Matmaster.txt` | Full-repository audit findings, P0/P1/P2/P3 remediation prompts |
| Cosmic UI Console plan | `docs/plans/2026-08-29-cosmic-ui-console.txt` | Cosmic console polish + Evan pulse target implementation plan |

## Validation commands

Minimum before any durable behavior change:

```bash
npm run verify
npm run typecheck
```

Then the smallest focused Playwright lane for the touched surface.

Full lanes (from `Plan Genesis.md`):

```bash
npm test
npx playwright test tests/console-interactions.spec.js tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --reporter=list
```

Cross-references

- `README.md` "Key Docs" links to `Plan Genesis.md`, `Plan Beta.md`, `Plan Alpha.md`, and `JOBCARD.md`.
- Each plan file's Purpose section links back to this project plan and to `README.md`.
- `docs/SECURITY.md` is referenced from `README.md` runtime notes and from this plan.
