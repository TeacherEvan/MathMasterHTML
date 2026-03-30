# Performance & Stability Brainstorm Design

**Date:** 2026-03-31  
**Repository:** MathMasterHTML  
**Status:** Approved

## 1) Goal and Scope

### Primary goal

Improve **gameplay smoothness** across both desktop and mobile.

### Approach selected

**Option A: Instrument → baseline → guardrails** (test-first hardening before runtime optimization).

### In-scope (this pass)

- Event-driven performance instrumentation
- Repeatable scenario baselines
- Playwright guardrails and regression signals
- Diagnostics for identifying bottlenecks

### Out-of-scope (this pass)

- Gameplay/mechanics changes
- Large architectural rewrites
- Risky runtime behavior modifications

---

## 2) Success Criteria

Initial starter targets (subject to one baseline calibration pass):

- **FPS (active play):**
  - Desktop median: **≥ 55**
  - Mobile median: **≥ 50**
- **Frame-time spikes (95th percentile):**
  - Desktop: **≤ 22ms**
  - Mobile: **≤ 28ms**
- **Severe jank rate:** frames > 50ms **≤ 1%**
- **Input responsiveness proxy:** interaction-to-feedback
  - Desktop: **≤ 120ms**
  - Mobile: **≤ 170ms**
- **Stability gate:** same scenario run 3x with no crash/hang and low variance (**±10%** on key metrics)

---

## 3) Architecture and Data Flow

### Design principle

Maintain existing **event-driven architecture**. Instrumentation must be passive and not introduce direct cross-module calls.

### Components

1. **Runtime Metrics Collector**
   - Tracks FPS, frame-time distribution, jank %, interaction feedback timing proxy, and event throughput.
2. **Scenario Profiler Hooks**
   - Tags and measures known heavy states (worm bursts, dense symbol rain, lock transitions).
3. **QA Guardrail Layer**
   - Converts metrics into warning/enforcement checks in Playwright outputs.

### Data flow

Gameplay events → metrics snapshots → scenario-tagged aggregates → local/CI assertions → pass/warn/fail signals.

### Runtime control

Instrumentation is behind a **toggle/flag** so normal player runtime can avoid overhead when desired.

---

## 4) Validation Strategy

### Rollout policy

1. **Warning-only phase** in CI (collect confidence)
2. **Enforcement phase** after metric stability is confirmed
3. Re-baseline only with documented reason tied to intentional feature/runtime change

### Platform policy

Desktop and mobile are first-class targets; all baseline and guardrail scenarios run for both lanes.

---

## 5) Risk and Rollback

### Risk controls

- No gameplay logic changes in this pass
- Passive listeners and bounded logging only
- Incremental PRs with isolated scope

### Rollback path

Disable instrumentation flag/hooks; guardrails can be switched from fail→warn if needed during investigation.

---

## 6) Implementation Milestones

### Milestone 1 (PR 1): Baseline scaffolding

- Add instrumentation toggle
- Capture core metrics in manual + Playwright runs
- Define baseline output/report format

### Milestone 2 (PR 2): Scenario standardization

- Define fixed desktop/mobile scenario catalog
- Ensure deterministic setup inputs and run durations

### Milestone 3 (PR 3): CI warning gates

- Add non-blocking threshold checks
- Publish metric deltas in test output artifacts

### Milestone 4 (PR 4): CI enforcement

- Promote stable warning checks to blocking checks
- Document re-baseline process and criteria

### Milestone 5 (PR 5): Optimization backlog kickoff

- Rank bottlenecks by measured impact
- Create targeted optimization tasks with expected gains

---

## 7) Next Step

Hand off to **superpower-plan** to generate the implementation plan (tasks, file targets, verification commands, and sequencing).
