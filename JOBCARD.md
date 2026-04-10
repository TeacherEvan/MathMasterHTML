# JOBCARD

## Latest update (2026-04-10)

- Consolidated the repository to a five-Markdown policy: `.github/copilot-instructions.md`, `JOBCARD.md`, `Plan Genesis.md`, `Plan Beta.md`, and `Plan Alpha.md`.
- Merged the old README, system docs, worm guides, competition docs, task brief, and superpower planning artifacts into the three surviving plan files based on content ownership.
- Converted runtime problem assets from Markdown to JSON so gameplay data no longer violates the Markdown ceiling.
- Updated verification logic to enforce the five-file policy and guard against future Markdown sprawl.

## Recent milestones

### Android WebView and mobile recovery

- Compact/mobile classification remains centralized in `src/scripts/display-manager.js`.
- Focused Android WebView-like contracts were added for Panel C and symbol-rain behavior.
- Mobile onboarding, startup, and compact-control work stayed aligned with the shared gameplay-ready contract.

### Settings, updates, and local persistence

- Level select owns the settings surface.
- `window.UserSettings` persists quality, locale, sound, and reduced-motion preferences.
- Deferred refresh and cache recovery stay outside active gameplay.

### Welcome and onboarding polish

- Welcome and level-select copy were tightened for mobile clarity.
- Local player naming is supported through device-only persistence.
- The H2P path now exists as a dedicated tutorial route separate from Beginner.

## Current durable truths

- `npm` is the local workflow entrypoint.
- Playwright is the active browser QA stack.
- Event-driven integration remains the runtime rule.
- Root HTML files remain redirect entrypoints; active runtime pages live in `src/pages/`.
- Panel A and B sizing belongs to `src/scripts/display-manager.js`.
- Only five Markdown files are allowed in this repository.
