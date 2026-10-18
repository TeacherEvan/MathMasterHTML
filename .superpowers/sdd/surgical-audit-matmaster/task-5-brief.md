# Task 5 Brief — P1: Eliminate Render-Blocking CSS @import Barrels

**Source plan:** docs/plans/SurgicalAudit Matmaster.txt (Step 5, Prompt 5)
**BASE commit:** f4c176d

## Context / Where this fits
Phase 2, Task 2 of the surgical remediation plan. Addresses P1 finding #1: 16-18 CSS @import barrel files force sequential render-blocking HTTP waterfalls across child CSS shards. Each @import triggers a separate browser fetch; nested @imports (e.g., line-6-transformer.effects.css → keyframes.*.css) create 2-3 level chains causing FOUC and layout shifts on game.html.

## Verified current state — 18 CSS files contain @import rules
All are tiny barrel files (3-15 lines) that only import children. None contain substantive CSS rules themselves.

| # | Barrel file | Lines | @import targets |
|---|-------------|-------|-----------------|
| 1 | `src/styles/css/game-polish.chrome.css` | 4 | game-polish.chrome.tokens.css, .modal.css, .playfield.css, .controls.css |
| 2 | `src/styles/css/level-select.details.css` | 5 | level-select.details.core.css, .effects.css, .responsive.css |
| 3 | `src/styles/css/lod-animations.css` | 6 | lod-animations.tiers.css, .reduced-motion.css, .containment.css, .gpu.css |
| 4 | `src/styles/css/game-responsive.css` | 15 | game-responsive.touch.css, .layout.css, .mobile-landscape.css, .mobile-landscape.shallow.css, .rotation.css, .modals.css |
| 5 | `src/styles/css/worm-effects.css` | 5 | worm-effects.core.css, .powerups.css, .elementals.css, .ui.css, .nearmiss.css |
| 6 | `src/styles/css/worm-base.css` | 4 | worm-base.core.css, .variant.css, .states.css, .carried.css |
| 7 | `src/styles/css/console.css` | 4 | console.core.css, .modal.css, .responsive.css, .worm.css |
| 8 | `src/styles/css/game-animations.css` | 5 | game-animations.core.css, .celebration.css, .combo.css, .achievement.css, .near-miss.css |
| 9 | `src/styles/css/modern-ux-enhancements.css` | 3 | modern-ux-enhancements.core.css, .toasts.css, .interactions.css |
| 10 | `src/styles/css/lock-components/line-5-transformer.css` | 3 | line-5-transformer.core.css, .structure.css, .animations.css |
| 11 | `src/styles/css/lock-components/line-6-transformer.css` | 6 | line-6-transformer.core.css, .entities.css, .segments.css, .ui.css |
| 12 | `src/styles/css/lock-components/line-3-transformer.css` | 6 | line-3-transformer.core.css, .mechanics.css, .decorations.css, .controls.css |
| 13 | `src/styles/css/lock-components/line-4-transformer.css` | 3 | line-4-transformer.core.css, .structure.css, .animations.css |
| 14 | `src/styles/css/lock-components/line-1-transformer.css` | 8 | line-1-transformer.core.css, .levels.css, .mechanics.motion.css, .mechanics.details.css, .keyframes.css, .controls.css |
| 15 | `src/styles/css/lock-components/line-6-transformer.effects.css` | 6 | NESTED: line-6-transformer.effects.states.css, .keyframes.transform.css, .keyframes.orb.css, .keyframes.particles.css |
| 16 | `src/styles/css/lock-components/line-2-transformer.css` | 5 | line-2-transformer.core.css, .structure.css, .mechanics.css, .controls.css, .animations.css |
| 17 | `src/styles/css/lock-components/line-3-transformer.effects.css` | 4 | NESTED: line-3-transformer.effects.states.css, .keyframes.css |
| 18 | `src/styles/css/index.css` | 13 | buttons.tiers.css, shell.dvh.css, index.core.css, .actions.css, .matrix.css, .hero.css, .logo.css, .effects.css, .scoreboard.css, .responsive.css, .responsive.compact.css |

## Requirements (verbatim from Prompt 5)
"Inspect the 16 CSS @import barrel files in src/styles/css/ (...). Inline their child @import rules or update src/tools/scripts/line-limit.config.js to allow consolidated per-component stylesheets so src/pages/game.html, src/pages/index.html, and src/pages/level-select.html do not trigger multi-depth sequential CSS @import network waterfalls."

## Decision
**Inline child @import rules** — replace each `@import url(...)` line in the parent barrel with the actual CSS content of the referenced child file. Handle nested @imports recursively (files #15 and #17 import keyframes files that may themselves be leaves). This eliminates all @import chains while preserving the same file structure.

## Report contract
Write full implementation report to `.superpowers/sdd/surgical-audit-matmaster/task-5-report.md`.
Return: status, commits, one-line test summary, concerns.

## Global constraints (binding)
- Replace @import url(...) with inlined child content (not just remove the @import — the styles must be preserved)
- Handle nested @imports recursively (line-6-transformer.effects.css, line-3-transformer.effects.css)
- No @import rules should remain in any of the 18 files after the change
- All child CSS files remain on disk (they may still be referenced from elsewhere — do NOT delete them)
- Do not change file names or paths
- `node --check` is N/A for CSS; verify by grepping that zero @import rules remain in the 18 files
- The already-lowercased line-1-transformer.css and line-5-transformer.css (from Task 1) must keep their lowercase @import targets