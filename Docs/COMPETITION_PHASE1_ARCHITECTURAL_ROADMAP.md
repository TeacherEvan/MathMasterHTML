# Competition Productionization Roadmap (Phase 1)

**Project:** MathMasterHTML
**Date:** 2026-03-09
**Role:** Lead Architect + Multi-Agent Orchestrator
**Scope:** Architecture audit + competition roadmap only (no game-code changes)

---

## 1) Executive Summary

MathMasterHTML has strong foundations for a competition entry: pure browser runtime, modularized subsystems, and a strong event-driven gameplay loop (`symbolClicked` → `symbolRevealed` → `problemLineCompleted` → lock/worm progression).

However, the current implementation is still tuned for local single-client play. To productionize for international competition conditions, we need:

1. **Architecture hardening** (load-order determinism, contract clarity, reduced global coupling)
2. **Dedicated Playwright competition QA environment** (deterministic seeds, robust telemetry, flaky controls)
3. **Online-match netcode blueprint** (authoritative protocol + reconnect/resync + loading fallback)
4. **Competitive UX uplift** (readability under pressure, keyboard accessibility, failure-state handling)

This document is the **Phase 1 roadmap** and intentionally halts before implementation.

---

## 1.1) Repo Reality Check

This roadmap is grounded in the current repository state, not a hypothetical rewrite target.

### Verified repo facts

- The game is run locally with `npm run start` using `http-server` on port `8000`.
- Browser automation is already configured in `playwright.config.js` with:
  - `chromium`
  - `firefox`
  - `webkit`
  - `iphone-13`
  - `pixel-7`
- Existing test commands are Playwright-based (`npm run test`, `npm run test:ui`, `npm run test:headed`).
- The architecture remains script-tag/global-runtime based even though `package.json` declares `"type": "module"`.
- The repository contains a service worker and offline-capable application shell elements.

### Tooling drift and architecture drift already present

- `package.json` required cleanup because duplicate `devDependencies` keys had created configuration drift risk.
- Workspace tasks currently reference **Maven (`mvn -B verify`, `mvn -B test`)**, which do not match this repo's actual Node/Playwright toolchain.
- Documentation still mixes legacy paths like `js/...` with current paths such as `src/scripts/...`, increasing onboarding and maintenance friction.

### What this means for planning

Before deep refactoring or netcode work, the project needs a **tooling trust pass**:

1. make scripts/tasks/documentation agree,
2. make startup/runtime contracts explicit,
3. ensure QA runs against the real app entrypoints and not stale assumptions.

This is now considered a **Phase 0 prerequisite** for reliable execution.

---

## 2) Multi-Agent Findings (Consolidated)

### Agent Alpha — Architecture

#### Detected stack and runtime model

- Pure HTML/CSS/JavaScript, browser-only runtime
- Script-tag/global `window.*` architecture (not import-based ESM at runtime)
- Event-driven inter-module communication is present and central
- Three-panel composition is coherent and scalable conceptually

#### Primary structural bottlenecks (ranked)

1. Script load-order fragility (`game.html` ordered script chain)
2. Global namespace coupling (`window.*` cross-system state reach-through)
3. Prototype patching/extension layering (`worm-system.*`, `lock-manager.*`)
4. Large mutable worm hub complexity (`worm.js` + split helpers)
5. Implicit event contracts (payload schemas not versioned)
6. Mixed communication model (events + direct singleton mutation)
7. Multi-init race potential (`DOMContentLoaded` listeners + dynamic loader behavior)

---

### Agent Beta — Research & Security

#### Threat model priorities

- Primary threat is **integrity abuse/cheating via DevTools**, not data exfiltration
- Secondary threat is **availability degradation** via event/spawn flood patterns

#### Top risks

- Public custom-event spoofing can fake progression/game actions
- Worm spawn queue/caps can be abused for performance collapse
- Dynamic HTML injection surfaces require strict sanitization/allowlisting paths only
- Service worker caching policy can preserve stale/bad artifacts under degraded network
- Client storage trust allows progression tampering (expected for client-only apps, but should be explicitly bounded)

#### Mitigation theme

- Keep architecture lightweight: schema validation, event gateway/rate-limits, bounded queues, strict loader allowlists, safer cache policy.

---

### Agent Gamma — QA Automation (Playwright)

#### Current baseline

- Existing Playwright setup already supports Chromium/Firefox/WebKit and mobile profiles.
- Good starting point, but competition mode needs stronger determinism and observability.

#### Required QA productionization

- Dedicated competition profile with three lanes:
  - **PR Smoke** (fast deterministic subset)
  - **Pre-merge Full Matrix** (all browsers/devices)
  - **Nightly Soak + Perf** (repeatability and regression trending)
- Deterministic seed strategy + state resets
- Runtime instrumentation for network, console/page errors, and performance budgets
- Flaky quarantine policy and strict gating

---

### Agent Delta — Netcode

#### Current state

- No real-time multiplayer transport/authority layer currently present.
- Existing local event pipeline is excellent as a **client-side domain bus**, but insufficient for synchronized online matches.

#### Netcode requirements

- Introduce authoritative envelope protocol with sequence/ack/tick metadata.
- Add connection lifecycle (join, ready, loading, start, heartbeat, reconnect, resync).
- Move authoritative ownership to server for timer/score/spawn progression in online mode.
- Add loading-timeout and fallback paths to avoid static waiting states.

---

### Agent Epsilon — UX/UI

#### High-priority UX competition gaps

- Keyboard reliability for rapid symbol interactions must be guaranteed.
- Stress readability (especially mobile/timed play) needs minimum legibility guarantees.
- Failure-state UX for loading/reconnect/errors needs explicit in-game messaging.
- Accessibility needs stronger semantic keyboard/screen-reader pathways in level selection and critical controls.

---

## 3) Target Architecture (Phase 1 Design)

### 3.1 Architecture Principles

1. Preserve event-driven communication as the core integration mechanism.
2. Introduce explicit contracts (event payload schema + versioning) before deeper rewrites.
3. Decouple systems through adapters/gateways rather than direct singleton mutation.
4. Enforce deterministic startup and deterministic test entry points.

### 3.2 Phase-Based Refactor Blueprint (No code changes yet)

- **Phase 0 — Contract & Observability Stabilization**

  - Normalize tooling truth (`package.json`, workspace tasks, docs, QA entrypoints).
  - Define canonical event contract registry.
  - Add startup diagnostics and dependency visibility.
  - Add schema checks in non-production/debug contexts.

- **Phase 1 — Bootstrap Determinism**

  - Consolidate startup orchestration and dependency manifest.
  - Prevent silent partial initialization modes.

- **Phase 2 — Boundary Hardening**

  - Replace direct cross-system state mutation with event/adapters.
  - Introduce domain adapters (`game`, `worm`, `lock`, `console`).

- **Phase 3 — Internal Composition Cleanup**
  - Reduce prototype patch complexity.
  - Clarify ownership and lifecycle responsibilities per subsystem.

---

## 4) Dedicated Playwright Competition Environment Spec

### 4.1 Execution Lanes

1. **qa-smoke (required on PR):**

   - Chromium + one mobile profile
   - Deterministic seed
   - Critical gameplay journey only

2. **qa-matrix (required on release/main gate):**

   - Chromium, Firefox, WebKit + iPhone + Pixel profiles
   - Full suite across functional gameplay categories

3. **qa-soak-monitor (nightly):**
   - Repeated runs + perf/network trend capture
   - Regression alerting for instability or degradation

### 4.2 Determinism Policy

- Inject test seed (`MM_TEST_SEED`) and log it with artifacts.
- Reset browser/application state per test:
  - local/session storage reset
  - service worker/cache neutralization
  - game runtime cleanup hooks
- Use explicit URL/level entry for each scenario.

### 4.3 Instrumentation & Artifacts

- Capture: console errors/warnings, page errors, failed requests, HTTP >= 400.
- Collect per-test network and performance summaries.
- Artifact policy:
  - screenshots on failure
  - traces on retry/failure
  - video retained for failures in matrix lanes

### 4.4 Gating

- Hard fail on unclassified runtime errors.
- Hard fail on missing critical event sequence.
- Flaky quarantine policy with explicit approval process.
- Maintain FPS/latency guardrails in nightly performance lane.

### 4.5 Planned QA Deliverables

The competition QA plan should result in these concrete artifacts:

- `playwright.competition.config.js` or equivalent competition-specific config
- shared deterministic test fixtures for seed/state reset
- runtime observers for console/network/performance capture
- synthetic match monitoring spec/output format
- CI lane definitions for smoke, matrix, and soak execution

None of these are implemented in this roadmap phase; they are named here so execution can be tracked precisely.

---

## 5) Netcode & Online Match Blueprint

### 5.0 Netcode Decision Gate

The repository does **not** currently implement online multiplayer transport. Because of that, online-match work should proceed only after one product decision is confirmed:

> **Is online competitive synchronization a real competition requirement, or is the immediate goal to harden loading/state behavior in a local/offline-first game?**

If online play is **required**, proceed with the full authoritative protocol plan below.
If online play is **not required immediately**, prioritize:

- loading-state resilience,
- deterministic state handling,
- anti-cheat/event hardening,
- synthetic monitoring hooks that can later back a multiplayer mode.

This prevents over-engineering a transport layer before the competition brief actually demands it.

### 5.1 Authoritative Event Envelope

All network messages should include:

- `v`, `matchId`, `sessionId`, `playerId`
- `seq`, `ack`
- `serverTick`, timestamp fields
- `type`, `payload`
- optional integrity token/signature

### 5.2 Core Message Families

- Session/lobby: `HELLO`, `JOIN_MATCH`, `PLAYER_READY`, `MATCH_START_AT`
- Gameplay commands: `CMD_SYMBOL_CLICK`, `CMD_POWERUP_ACTIVATE`
- Authoritative outcomes: reveal/line/spawn/score/timer/problem-complete events
- Health/reliability: `PING/PONG`, heartbeat, reconnect, resync
- Control/errors: validation/rate-limit/match-abort semantics

### 5.3 Client Online State Machine

`BOOT -> ASSET_PRELOAD -> CONNECTING -> AUTH -> LOBBY -> READY -> MATCH_LOADING -> CLOCK_SYNC -> COUNTDOWN -> IN_MATCH -> (DEGRADED/RECONNECTING/RESYNCING branches) -> MATCH_END -> RESULTS`

### 5.4 Anti-Desync & Anti-Cheat Essentials

- Server validates action legality and cadence.
- Client predictions are provisional; server outcomes are authoritative.
- Periodic snapshots + deltas for reconciliation.
- Replay/duplicate protection via `seq` windows.

### 5.5 Loading-State Recovery Policy

Apply staged timers to all critical loading paths:

- `T_soft`: show warning/degraded UI
- `T_hard`: fallback action (retry/fallback pack/bot substitution/abort policy)

This eliminates static loading deadlocks during online matches.

---

## 6) UX/UI Enhancements for Competitive Play

### Priority P0 (must-have)

- Guarantee keyboard-only equivalence for critical symbol actions.
- Enforce minimum legibility thresholds for timed gameplay text.
- Semantic/focus-safe level selection and primary controls.

### Priority P1

- Replace modal-blocking interactions with inline coaching patterns.
- Add explicit reconnect/offline/in-retry status indicators.
- Add visible recovery affordances for failed loads/retries.

### Priority P2

- Improve clarity of combo/power-up feedback under pressure.
- Harmonize reduced-motion behavior across all gameplay surfaces.
- Improve critical-state HUD signaling (time pressure, streak urgency).

### UX Success Metrics

- Keyboard flow pass rate: 100% in cross-browser tests
- Input-to-feedback p95 latency: < 80ms (target)
- Reduced critical readability failures in mobile timed sessions
- Lower stuck/retry abandonment rates during degraded network tests

---

## 7) Delivery Sequence (Roadmap)

1. **Week 1:** Tooling truth pass + contracts + observability + Playwright competition profile scaffold
2. **Week 2:** Startup determinism + state reset hardening + QA gating rollout
3. **Week 3-4:** Loading timeout framework + net bridge/protocol skeleton (if online mode is approved)
4. **Week 5-6:** Reconnect/resync + anti-cheat validation + UX P0/P1 rollout
5. **Week 7+:** Soak/perf stabilization + P2 polish + release hardening

### Go/No-Go checkpoints

- **Checkpoint A:** Tooling truth restored (`package.json`, tasks, docs, and test entrypoints agree)
- **Checkpoint B:** Deterministic QA lane is green in smoke profile
- **Checkpoint C:** Netcode scope approved explicitly before transport implementation begins
- **Checkpoint D:** Accessibility + performance gates are enforced in CI before release hardening

---

## 8) Risks & Controls

- **Risk:** Architecture drift from event-driven rules
  **Control:** Event contract registry + CI checks for prohibited direct cross-module calls.

- **Risk:** Hidden startup dependency breakage
  **Control:** deterministic bootstrap map + fail-fast diagnostics in QA.

- **Risk:** Online desync/regression during rollout
  **Control:** feature-flag rollout with local mode fallback and synthetic match monitoring.

- **Risk:** Accessibility regressions during UI polish
  **Control:** keyboard/reduced-motion/accessibility checks as merge gates.

---

## 9) Phase 1 Definition of Done (Planning Stage)

Planning stage is complete when:

- Tooling drift and scope assumptions are documented and approved.
- Architecture bottlenecks are explicitly prioritized.
- Playwright competition environment spec is approved.
- Netcode protocol/state-machine blueprint is approved.
- UX competitive enhancement backlog + metrics are approved.
- Execution can begin under change-control after approval.

---

## 10) Halt Gate (As Requested)

**Execution is intentionally paused here.**
No game code has been modified in this phase.

➡️ **Please verify and approve this roadmap before I proceed to implementation.**

---

## 11) Linked Execution Artifact

Implementation planning has been expanded into:

- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`

That document maps the roadmap to concrete files, validation steps, risk levels, and rollback guidance.
