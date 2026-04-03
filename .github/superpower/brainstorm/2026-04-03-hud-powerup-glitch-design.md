# HUD Power-Up Activation Glitch Design

## Overview

This design introduces a high-impact, refined "maximalist cyber" animation for power-up activations in the HUD (Score/Timer area). The goal is to provide immediate, satisfying visual feedback when a power-up (e.g., Chain Lightning, Spider, Devil) is deployed, enriching the dark-first training-console aesthetic of Math Master Algebra.

## Visual Design & Animation Choreography

The effect relies on a JS-driven skew and opacity glitch that triggers instantly on power-up activation.

**Choreography (150-250ms total):**

- **Frame 1-3:** The power-up icon instantly skews along the X-axis (-20deg to 20deg). Opacity randomly drops to ~0.4 and spikes to 1.
- **Frame 4-6:** A sudden, randomized `transform: scale(1.1) translate(X, Y)` jitter simulates tracking instability.
- **Frame 7-10:** The skew snaps to 0, and the icon settles into its active state with a quick `ease-out-expo` deceleration, leaving a faint glowing drop-shadow.

## Architecture & Integration Strategy

The implementation aligns with the repository's Event-Driven Architecture and performance boundaries.

- **Event Listener:** A dedicated watcher listens for the `powerUpActivated` custom DOM event, extracting the target HUD slot.
- **Glitch Engine:** A `requestAnimationFrame` loop drives the 250ms duration. It maps the glitch progress to randomized CSS custom properties (`--power-up-skew`, `--power-up-scale`, `--power-up-opacity`) injected via inline styles.
- **State Management:** When the loop concludes, all custom inline styles are scrubbed, restoring the element to its base CSS state defined in `src/styles/css/score-timer.css` or `game-effects.css` to prevent lingering side-effects.
- **Accessibility:** If `prefers-reduced-motion` is active, the animation is skipped entirely. Instead, the icon performs an instant color change to acknowledge the state transition, fulfilling WCAG AA requirements.

## Anti-Pattern Avoidance

- **No generic AI aesthetics:** Refrains from using default glowing neon on dark backgrounds without purposeful distortion.
- **No layout thrashing:** Exclusively targets `transform` and `opacity` properties for GPU acceleration.
