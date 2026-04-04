# Task Brief

## Design Context

### Users

- **Primary audience**: Solo algebra learners (teens and adult self-learners) practicing independently.
- **Context**: Browser-native PWA, fullscreen landscape on desktop; mobile is acceptable but secondary.
- **Job to be done**: Turn equation-solving into an interactive, high-feedback drill where clicking falling symbols reveals solution steps line by line.
- **Emotional arc**: Start each problem feeling _confident and capable_; build _momentum and flow_ as lines clear; end with a _rewarding sense of mastery_.

### Brand Personality

- **Three words**: Futuristic. Innovative. Smooth.
- Voice is polished, motivating, and capable — never chaotic, intimidating, or childish.
- The interface should feel like a premium training console, not a toy or a generic edtech dashboard.

### Aesthetic Direction

- **Tone**: Refined training-console sci-fi — the kind of interface a competent operator would trust. Preserve the project's Matrix DNA but push it toward premium clarity.
- **Theme**: Both themes are supported, with dark mode as the canonical benchmark for quality and immersion. The runtime, PWA shell, and all three screens (welcome, level-select, game) should preserve fullscreen play ergonomics in either theme.
- **References**: No external references — evolve from the current state. The level-select screen (phosphor/brass/ember palette, Alegreya Sans, operator-console feel) is the quality bar to bring the other screens up to.
- **Anti-references**: Generic AI-neon (cyan-on-dark, purple-blue gradients, glassmorphism everywhere), noisy arcade excess, childish cartoon energy.
- **Signature interaction**: The synchronized rhythm between falling symbol rain and line-by-line algebra reveal is the unforgettable identity moment.

### Color System

- **Two-layer model**: OKLCH tokens for surfaces, text, and structural color; legacy neon for gameplay effects only.
- **Surface tokens** (from `game-polish.chrome.tokens.css`):
  - `--shell-bg` / `--shell-panel` / `--shell-panel-strong`: olive-tinted dark neutrals (oklch 0.14–0.24, hue 122)
  - `--shell-copy` / `--shell-copy-muted`: warm off-whites (oklch 0.79–0.95, hue 105)
  - `--shell-line`: primary accent green (oklch 0.84, chroma 0.17, hue 132)
  - `--shell-signal`: warm gold signal (oklch 0.84, chroma 0.12, hue 82)
  - `--shell-alert`: amber warning (oklch 0.74, chroma 0.16, hue 42)
- **Level-select palette** (from `level-select.polish.css`):
  - Phosphor `#8ecb75` (beginner), Brass `#c7a44c` (warrior), Ember `#c76b52` (master)
  - Deep ink ladder: `--level-ink-0` through `--level-ink-4`
- **Gameplay neon** (legacy, for effects/feedback only):
  - Matrix green `#00ff00` — falling symbols, score glow, success feedback
  - Gold `#ffd700` — title accents, achievement highlights
  - Red `#ff0000` → `#ff6666` — active line reveal, danger/wrong-answer pulse
  - Cyan `#00ffff` — completed-row symbols
- **Rule**: New structural/surface work should use OKLCH tokens. Neon hex values stay only in animation keyframes and transient game effects.

### Typography

- **Display**: Orbitron — scoped to headings, HUD labels, and title lockups only. Never used for body text or long-form UI copy.
- **Body**: Exo 2 — primary reading font for problem text, solution steps, modals, and interface copy.
- **Level-select alternate**: Alegreya Sans (body) + IBM Plex Mono (data/stats) — already in production for the level-select screen.
- **Scale**: Use `clamp()` with a modular scale. Current HUD uses 8px labels / 20px values in Orbitron; body copy uses `clamp(1rem, 2.5vw, 1.4rem)`.
- **Rule**: Vary font weight and size aggressively for hierarchy. Orbitron 900 for display, 700 for labels; Exo 2 400/500/700 for body tiers. Never use monospace as a lazy "technical" shorthand.

### Motion

- **Easing tokens**: `--ease-out-quart`, `--ease-out-quint`, `--ease-out-expo` — use these for all new animation work. No bounce or elastic easing.
- **High-impact moments over scattered micro-interactions**: Staggered entrance reveals on page load, decisive feedback on symbol match, satisfying lock progression.
- **Performance rules**: Transform + opacity only. No animating width/height/padding. No `transition: all`. `will-change` on animated elements. Cache DOM queries outside animation loops.
- **Reduced motion**: Full `prefers-reduced-motion: reduce` support already exists in `lod-animations.reduced-motion.css`. Any element starting at `opacity: 0` in an entrance animation must have a reduced-motion rule restoring `opacity: 1` and `transform: none`.

### Layout

- **Three-panel game**: Panel A (problem + lock), Panel B (solution steps + worms + console), Panel C (symbol rain). These zones are fixed.
- **HUD**: CSS Grid with three zones — score, timer, power-up reserve. Elements must not overlap.
- **Desktop-first**: Primary viewport is landscape fullscreen. Mobile is acceptable but secondary — adapt the layout, don't amputate features.
- **Spacing**: Use fluid spacing with `clamp()`. Tight groupings within panels, generous separation between them.

### Accessibility

- **Target**: WCAG AAA where feasible; AA is the hard minimum.
- **Contrast**: 7:1 for normal text, 4.5:1 for large text / UI components where AAA is achievable.
- **Focus**: `focus-visible` outlines on all interactive elements (green `#00ff00` for game, `--level-phosphor` for level-select). No visible outline on pointer click.
- **Non-color cues**: Shape, text labels, and animation (respecting reduced-motion) must supplement all color-coded state changes.
- **Reduced motion**: Already implemented — maintain it for all new animation work.
- **Touch**: Use `pointerdown` instead of `click` for ~200ms improvement. Minimum 44×44px touch targets.

### Design Principles

1. **Focus under pressure**: Readability, hierarchy, and instant comprehension beat decoration. A student mid-problem should never squint or hesitate at the interface.
2. **Dark-first excellence, light-mode readiness**: Dark mode defines the visual quality bar, while light mode remains fully supported and intentionally designed.
3. **Signature rhythm first**: Prioritize synchronization between symbol rain and algebra reveal as the core experiential differentiator.
4. **Accessibility is structural**: WCAG AAA where feasible, AA always. Contrast, focus states, reduced motion, and non-color cues are mandatory, not optional polish.
5. **Systems over flourishes**: Build from cohesive token systems for color, type, spacing, and motion. No one-off visual hacks. Every new value should reference or extend existing tokens.
