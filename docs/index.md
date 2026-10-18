# MathMasterHTML Documentation Index

This index lists every maintained documentation surface in the repository and how they relate to each other.

## Root plan files (source of truth)

- [`Plan Genesis.md`](Plan%20Genesis.md) — Engineering source of truth: runtime architecture, boot sequence, three-panel contracts, module families, performance rules, gameplay integrity.
- [`Plan Beta.md`](Plan%20Beta.md) — Roadmap and execution: product priorities, decision gates, execution matrix, competition QA policy, feature tracks.
- [`Plan Alpha.md`](Plan%20Alpha.md) — Product, UX, and design: users, design direction, color/typography/motion/layout rules, accessibility, welcome-surface contract.
- [`JOBCARD.md`](JOBCARD.md) — Rolling work log: dated implementation history and verification results.

## Consolidated project plan

- [`docs/project-plan.md`](project-plan.md) — Single entry point that indexes the plan files above and every doc surface below.

## Docs folder

- [`docs/SECURITY.md`](SECURITY.md) — Canonical output-escaping rule (`window.DomSanitizer.escapeHTML`).
- [`docs/plans/SurgicalAudit Matmaster.txt`](plans/SurgicalAudit%20Matmaster.txt) — Full-repository audit findings and P0/P1/P2/P3 remediation prompts.
- [`docs/plans/2026-08-29-cosmic-ui-console.txt`](plans/2026-08-29-cosmic-ui-console.txt) — Cosmic console polish + Evan pulse target implementation plan.

## Other repo docs

- [`README.md`](https://github.com/TeacherEvan/MathMasterHTML/blob/main/README.md) — Quick start, core pages, runtime notes, scripts, validation.
- [`AGENTS.md`](https://github.com/TeacherEvan/MathMasterHTML/blob/main/AGENTS.md) — Active-repo rules and sibling-project notice.

## Cross-reference map

| From | To | Relationship |
|------|----|--------------|
| `README.md` | `Plan Genesis.md`, `Plan Beta.md`, `Plan Alpha.md`, `JOBCARD.md` | Key Docs |
| `Plan Genesis.md` | `README.md`, `docs/project-plan.md` | Purpose section (reciprocal link) |
| `Plan Beta.md` | `README.md`, `docs/project-plan.md` | Purpose section (reciprocal link) |
| `Plan Alpha.md` | `README.md`, `docs/project-plan.md` | Purpose section (reciprocal link) |
| `docs/project-plan.md` | All plan files, `README.md`, `docs/SECURITY.md`, `docs/plans/*` | Consolidated index |
| `docs/index.md` | All plan files, `docs/project-plan.md`, `docs/SECURITY.md`, `docs/plans/*`, `README.md`, `AGENTS.md` | This index |
