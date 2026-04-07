# Evan helper onboarding, preload, and install design

_Date: 2026-04-06_

## Goal

Design a polished onboarding/help flow for `MathMasterHTML` that:

- fixes the player-facing power-up visibility concern as a non-negotiable layout constraint
- introduces **Mr. Evan** as a guided first-time helper
- adds a real preload experience tied to actual readiness work
- delays install prompting until player intent is established
- works on mobile and desktop without treating desktop as the only source of truth

## Inputs and constraints

- Runtime is browser-native HTML/CSS/JS with script-tag modules.
- Inter-module behavior must remain **event-driven** via DOM events.
- Mobile is the primary quality bar.
- Existing gameplay architecture must not be bypassed with direct bot-only code paths.
- Existing report context highlighted mobile/UI-boundary concerns, especially around overlap and separation.

## Approved product flow

### First-run and first-difficulty behavior

- The app starts with a **real preload screen** that reflects actual setup/download readiness.
- There is **no forced fake 30-second delay**. If readiness completes early, the preload ends early.
- On the **first visit to each difficulty**, Evan auto-plays the opening problem.
- After the first auto-demo for a difficulty, Evan becomes **optional** instead of auto-running again.

### Evan interaction model

- Evan is represented by a visible guiding hand.
- During auto-help, Evan can:
  - identify and select needed symbols
  - kill worms
  - collect rewards/resources that drop from worms
  - use available power-ups
  - complete second-step power-up targeting when required
- The player can press **Skip** at any time to end auto-help and take over immediately.
- The player can later press **Solve** to summon Evan on demand.

### Install prompt timing

- The install request should appear only after **2–3 sessions**.
- The app should not show the install prompt on first launch.

## Approved architecture

Evan should be implemented as a separate, event-driven helper system layered on top of the current gameplay architecture.

### Modules

1. **Session gatekeeper**
   - Determines whether preload is active
   - Tracks whether a difficulty has already received its first Evan demo
   - Determines whether Evan should auto-start, remain optional, or stay hidden

2. **Evan controller**
   - Reads current game state
   - Chooses the next valid action
   - Re-evaluates when targets disappear or state changes

3. **Hand presenter**
   - Renders the hand guide
   - Animates movement and targeting cues
   - Controls the pulsing assist border and the corner label `Mr. Evan helping out`

4. **Preload/install shell**
   - Displays real startup progress
   - Handles readiness completion/fallback
   - Tracks engagement count for deferred install prompting

### Integration rules

- Evan must trigger the **same event contracts** as player input.
- Evan should not call unrelated module internals directly.
- The helper path must stay behaviorally aligned with real gameplay to reduce drift and regressions.

## Approved UI and layout behavior

### Power-up visibility contract

- The power-up bar is treated as a **reserved HUD lane**, not an incidental floating widget.
- On compact landscape mobile, it remains centered within Panel B’s top-safe zone.
- It must never overlap with:
  - timer/HUD elements
  - Panel B controls
  - Panel C boundary
- Desktop may use a roomier presentation, but the structural placement remains consistent.

### Evan presentation

- Evan’s visual presence includes:
  - a visible hand guide
  - a thin pulsing red border
  - a small corner label: `Mr. Evan helping out`
- Visual motion should use transform/opacity only.
- The assist visuals must respect reduced-motion preferences.
- Evan’s visuals should not obscure gameplay targets long enough to reduce clarity.

### Skip and Solve controls

- **Skip** is prominent only while Evan is actively auto-helping.
- **Solve** becomes the persistent opt-in helper control after the first auto-demo has been completed or skipped.
- Controls should be touch-safe, compact, and readable on mobile first.

### Preload presentation

- The preload screen should feel like a polished training-console boot sequence.
- It should communicate real readiness rather than fake time-filling.

## Approved state model

Recommended high-level states:

- `idle`
- `preload`
- `auto-demo-eligible`
- `helping`
- `skipped`
- `completed`
- `optional-helper`

### State behavior

- `preload` exits as soon as real readiness is achieved or fallback is required.
- `auto-demo-eligible` is entered only for a difficulty that has not yet received its Evan intro.
- `helping` covers both automatic tutorial behavior and later Solve-on-demand behavior.
- `skipped` transfers control to the player immediately and marks the auto-demo as consumed for that difficulty.
- `completed` marks the demo as finished for that difficulty.
- `optional-helper` is the steady-state after the first run.

## Failure handling

- If preload/setup fails, the game falls back to normal play immediately.
- If Evan loses a target because state changed, he re-evaluates instead of freezing.
- If a worm dies early, a symbol disappears, or a power-up target becomes invalid, Evan should select a new valid action.
- No onboarding or preload step may hard-block gameplay indefinitely.

## Persistence

Store lightweight local state for:

- per-difficulty Evan intro completion
- session count for install-prompt gating
- optional dismissal history for install messaging if needed

## Validation strategy

Validation should include:

### Layout and visibility

- power-up bar remains visible on mobile and desktop
- no overlap between power-up bar, timer, and Panel B controls
- no regression in three-panel compact landscape behavior

### Evan behavior

- auto-demo runs on first visit to each difficulty
- Skip interrupts cleanly
- Solve invokes Evan after the first-run tutorial has been consumed
- Evan can solve symbols, kill worms, collect drops, and use two-step power-ups

### Startup and install

- preload ends on real readiness, not fixed time
- preload has a safe fallback path
- install prompt appears only after 2–3 sessions

### Accessibility and interaction quality

- reduced-motion compatibility for Evan visuals and preload motion
- touch targets remain accessible on mobile
- keyboard-access baseline remains intact

## Recommended delivery strategy

Use a **staged architecture** approach:

1. Harden visibility and UI-boundary contracts for the power-up bar and related HUD elements
2. Add Evan as an event-driven helper actor
3. Add the real preload shell and deferred install prompt

This ordering reduces the risk of shipping a polished helper experience on top of unstable mobile layout behavior.

## Handoff note

This design is approved and ready for implementation planning in the next phase.
