# Design: Mobile Recovery MVP And Sequenced Stabilization
**Date:** 2026-04-09
**Status:** Approved
**Scope Tier:** MVP
**Author:** Brainstorm session with user

## Problem Statement
The current Android/mobile experience has several reported failures: the level-select screen is too text-heavy and unclear about where to tap to start, Panel C symbol rain appears absent, gameplay controls overlap or shift, Evan feels glitchy, and the requested progressive beat system has unclear status. The immediate need is a safe starting plan that restores clarity and reduces guesswork before implementation work fans out across multiple subsystems.

## Success Metrics
- [ ] Level select mobile view has one unmistakable primary start action for the active route.
- [ ] Mobile level-select content is easier to scan, with less non-critical copy competing with the start action.
- [ ] Remaining issues are worked in a dependency-aware order instead of broad unsorted fixes.
- [ ] Each workstream uses focused validation tied to the affected runtime surface.

## Constraints
| Category | Constraint | Source |
|----------|-----------|--------|
| Runtime | Active runtime pages live in `src/pages/`; preserve browser-native script-tag boundaries | Repo instructions |
| UX | First workstream should be an MVP, not a broad redesign | User decision |
| UX | Level-select first pass should improve both CTA hierarchy and copy reduction | User decision |
| Compatibility | Desktop may change if needed for consistency, but the first pass should stay low-blast-radius | User decision |
| Validation | Prefer focused Playwright/runtime checks before broad verification | User decision |

## Design

### Architecture Overview
Use a staged recovery plan rather than trying to fix all reported issues in one sweep. The first workstream is a contained level-select mobile MVP that preserves the existing route-switcher and active-card interaction model. After that, move through the remaining issues in dependency order: Panel C rain, gameplay mobile layout and Evan smoothness, then progressive audio integration/status.

### Components
#### Workstream 1: Level-select mobile MVP
- Keep the current `route-switcher` plus active `level-card` model.
- Reduce mobile copy density for the active card.
- Reduce secondary stat noise on mobile where it competes with the launch CTA.
- Make the active `.level-button` the clear visual anchor with a pulse/highlight treatment that respects reduced motion.
- Preserve keyboard route switching and explicit CTA launch behavior.

#### Workstream 2: Panel C rain diagnosis and repair
- Audit the live symbol-rain contract using touch-style `pointerdown` interactions on real falling symbols.
- Verify whether the issue is runtime visibility/spawn failure versus false negatives from click-based testing or onboarding state.

#### Workstream 3: Gameplay mobile layout and Evan smoothness
- Audit overlapping and shifting controls against the existing compact/mobile boundary contract.
- Treat Evan smoothness as part of the mobile boundary/runtime readiness path, not as an isolated animation tweak.

#### Workstream 4: Progressive beat/audio audit
- Treat the current report as a status/integration question first.
- Verify whether the existing progressive drum modules are wired into gameplay progression as intended before considering additional implementation.

### Data Flow
For level select, keep the existing flow intact:
- route-switcher button selects active level
- active card becomes visible on compact screens
- explicit level button launches `/src/pages/game.html?level=...`

For later workstreams, preserve current event-driven boundaries and diagnose at the owned surface:
- Panel C through `3rdDISPLAY.js` and `symbol-rain*.js`
- gameplay layout through the existing mobile boundary CSS/runtime surfaces
- Evan through its presenter/controller/runtime flow
- progressive audio through the current drum loader/sequencer/playback modules

### Error Handling
- Avoid broad fixes before reproducing each issue on the owned runtime surface.
- Prefer targeted diagnostic runs over full-suite inference.
- If a symptom cannot be reproduced with focused validation, treat it as a contract gap or device-specific integration issue rather than rewriting the subsystem immediately.

## Alternatives Considered
| Approach | Pros | Cons | Why Rejected |
|----------|------|------|-------------|
| Big-card tap target redesign | Very obvious primary action | Higher layout churn and larger behavior blast radius | Too large for the approved MVP |
| Sticky mobile launch bar | Strong CTA clarity | Adds a new layout model and extra mobile-only structure | More complexity than needed for first pass |
| Heavier full-page redesign | Could resolve multiple visual issues together | High risk, more desktop drift, harder validation | Not aligned with MVP scope |

## Risk Analysis
| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|-----------|-------|
| Fixing level select with too much structural churn | Medium | Medium | Keep the current route/card contract and focus on copy density plus CTA emphasis | Implementation phase |
| Misdiagnosing Panel C due to click-based automation instead of touch-style interaction | High | High | Use real `pointerdown`/`pointerup` checks on live falling symbols and reset onboarding state when reproducing | Implementation phase |
| Chasing gameplay overlap with CSS-only patches that violate current ownership boundaries | Medium | High | Diagnose against the existing compact/mobile boundary contract before changing styles or sizing logic | Implementation phase |
| Rebuilding progressive audio even though the core drum modules already validate green | Medium | Medium | Run an integration/status audit first and only expand implementation if gameplay progression wiring is actually missing | Implementation phase |

## Complexity Budget
| Element | Cost Level | Justification |
|---------|-----------|---------------|
| Level-select CTA-first trim | Low | Preserves current markup/interaction model |
| Panel C focused diagnosis | Low | Uses existing runtime/test surfaces |
| Mobile boundary/Evan stabilization follow-up | Medium | Crosses multiple runtime surfaces but follows recent plan history |
| Progressive audio status audit | Low | Starts as verification, not new subsystem work |

**Total complexity:** Within budget for MVP because the first implementation step stays narrow and later workstreams are explicitly sequenced rather than combined.

## Rollback Plan
- **Before launch:** revert the level-select MVP changes independently from gameplay/runtime work.
- **After launch:** remove the CTA emphasis and mobile copy-density changes without changing navigation contracts.
- **Later workstreams:** keep Panel C, gameplay mobile boundary, and audio follow-ups isolated so each can be reverted independently.

## What This Design Does NOT Do
- Does NOT redesign the entire level-select screen for all form factors in the first pass.
- Does NOT assume Panel C is broken at the code level before touch-accurate reproduction.
- Does NOT merge gameplay mobile layout fixes with the first level-select MVP.
- Does NOT assume progressive audio is absent just because its current runtime status is unclear.

## Open Questions
- [ ] On the user’s Android device, is the progressive beat issue complete absence, weak audibility, or incorrect progression timing?
- [ ] Is the Evan glitch report primarily about input timing, visual movement, or overlap with other controls?
- [ ] Which specific gameplay screen width/device combination shows the worst button overlap?

## Testing Strategy
- Level select MVP: focused level-select Playwright coverage plus narrow mobile readability checks.
- Panel C: explicit live-rain/touch-style interaction verification on gameplay runtime.
- Gameplay mobile/Evan: focused mobile boundary and Evan-related Playwright lanes.
- Progressive audio: focused drum progression/integration checks before any implementation expansion.