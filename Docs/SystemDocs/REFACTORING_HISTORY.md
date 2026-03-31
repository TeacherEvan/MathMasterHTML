# Refactoring History

This document replaces a large set of historical reports, one-off audits, completion summaries, and stale plans that were removed during the 2026-03 documentation spring clean.

## 2025-10: Worm-system cleanup foundations

Major themes from the October 2025 work:

- dead-code cleanup around deprecated worm/cloning paths
- constants extraction for power-ups, timing, and distances
- early movement and behavior helper extraction to reduce duplication
- initial worm docs, testing notes, and architecture summaries
- panel-specific bug fixes such as splat positioning, chain-lightning visuals, and draggable power-up UI

Durable takeaway: the worm system should keep splitting by concern instead of growing back into a monolith.

## 2025-11: Performance and testability push

Highlights carried forward:

- symbol-rain optimization through pooling, event delegation, caching, and throttling
- removal of `transition: all` style regressions
- stronger Playwright coverage for power-ups and gameplay flows
- refinement of touch-first interactions through `pointerdown`

Durable takeaway: performance wins in this repo come from reducing DOM churn and guarding animation hot paths.

## 2025-12: UX hardening and lazy-loading work

Consolidated from the removed UX completion reports:

- modernized loading feedback and polish layers
- lazy loading for heavy lock and component surfaces
- service worker and manifest work for PWA-style behavior
- accessibility and reduced-motion improvements
- broader cleanup of duplicate spawn logic and UI polish passes

Durable takeaway: UX work should preserve the existing event-driven runtime rather than layering a new framework onto it.

## 2026-01: Audits and systems consolidation

Consolidated from the removed January code review and audit reports:

- repeated findings about large-file pressure, logging noise, and duplicated logic
- score/timer and player-storage systems became part of the active runtime architecture
- repo documentation started shifting from legacy `js/` and `css/` paths toward `src/pages/`, `src/scripts/`, and `src/styles/`

Durable takeaway: when audits repeat the same findings, the answer is usually to update the living docs and code structure once rather than keeping multiple snapshots of the same diagnosis.

## 2026-02: Worm modernization and line-limit planning

Consolidated from the removed forensic, architectural, and line-limit plans:

- worm-system file sizes, pooling, and state handling remained active concerns
- modernization plans emphasized bounded complexity, incremental extraction, and safer ownership boundaries
- line-limit initiatives identified where future splits would produce the most leverage

Durable takeaway: future worm refactors should remain incremental, behavior-safe, and tied to real hotspots rather than design-pattern churn.

## 2026-03: Tooling truth and competition readiness

Major threads from March 2026:

- repo guidance was corrected to match the real Node and Playwright workflow
- competition roadmap and execution-matrix docs were added as the active planning set
- performance instrumentation expanded with scenario-based Playwright coverage
- worm reward work added muffin rewards, bonus scoring, and idempotency checks around `wormExploded`
- documentation was trimmed back to a smaller living set on `main`

Durable takeaway: prefer a few accurate docs over many stale ones. Competition and readiness work depends on truthful docs and deterministic tooling first.

## Consolidated source families

The useful context from these removed document families now lives here or in the surviving system guides:

- root audits and completion reports
- system implementation summaries and refactor summaries
- graphics and timer/scoring proposals that were superseded by shipped code
- worm audit, forensic, refactor-plan, and testing-architecture snapshots
- stale example and proposal Markdown and temporary planning docs

When you need the current rulebook, read `DEVELOPMENT_GUIDE.md`, `ARCHITECTURE.md`, `PERFORMANCE.md`, and the worm guides first. Use this file only for historical context.
