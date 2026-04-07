# Agent Customization Architecture Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make developer-facing docs the single source of truth for runtime and test behavior while turning `.github/` customization files into thin, scoped agent-facing wrappers with a documented update protocol.

**Architecture:** Add one authoritative system doc that defines the customization layers and their ownership, then rewrite the workspace and scoped instruction files so they route agents to the right docs instead of restating subsystem behavior. Keep worm behavior and worm testing truth in the worm docs, keep general workflow truth in the system docs, and require the relevant `.github/` wrapper to be updated only when agent-facing guardrails or validation expectations actually change.

**Tech Stack:** Markdown documentation, VS Code Copilot workspace instructions, file-scoped `.instructions.md` files, existing repo docs under `Docs/SystemDocs/` and `Docs/Worms/`, existing `npm run verify` and `npm run typecheck` validation commands.

---

## File Structure

- Create: `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
  Responsibility: authoritative ownership map for workspace instructions, scoped instructions, system docs, subsystem docs, and the instruction update protocol.
- Modify: `Docs/SystemDocs/_INDEX.md`
  Responsibility: add the new architecture doc to the recommended reading order.
- Modify: `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
  Responsibility: add a concise rule that docs own behavior and `.github/` files are thin wrappers.
- Modify: `README.md`
  Responsibility: include the new architecture doc in the durable documentation set.
- Modify: `.github/copilot-instructions.md`
  Responsibility: keep only repo-wide reminders, routing, and doc links; remove subsystem-detail drift.
- Modify: `.github/instructions/gameplay-runtime.instructions.md`
  Responsibility: thin wrapper for gameplay runtime work with source links, a few non-negotiables, and validation expectations.
- Modify: `.github/instructions/worm-runtime.instructions.md`
  Responsibility: thin wrapper for worm work with source links, a few non-negotiables, and validation expectations.
- Modify: `.github/instructions/playwright-tests.instructions.md`
  Responsibility: thin wrapper for Playwright work with source links, lane-selection guidance, and validation expectations.
- Modify: `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
  Responsibility: explicitly declare itself the authoritative worm runtime behavior reference for future instruction wrappers.
- Modify: `Docs/Worms/WORM_TESTING_GUIDE.md`
  Responsibility: explicitly declare itself the authoritative worm testing reference for future test instruction wrappers.

## Out Of Scope

- Creating additional scoped instruction files for audio, lock flow, score/timer, or quality-tier systems.
- Building a code generator or audit CLI for markdown instructions.
- Changing runtime JavaScript, CSS, or Playwright behavior outside the documentation and instruction architecture.

### Task 1: Publish The Customization Ownership Model

**Files:**

- Create: `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
- Modify: `Docs/SystemDocs/_INDEX.md`
- Modify: `README.md`

- [ ] **Step 1: Run the gap audit to verify the ownership model is missing**

Run: `rg -n "AGENT_CUSTOMIZATION_ARCHITECTURE|single source of truth|instruction update protocol|thin wrapper" Docs/SystemDocs/_INDEX.md Docs/SystemDocs/DEVELOPMENT_GUIDE.md README.md .github/copilot-instructions.md .github/instructions`
Expected: either no matches or only incidental matches; there is no dedicated architecture doc that defines ownership and update protocol yet.

- [ ] **Step 2: Create the authoritative architecture doc**

```markdown
# Agent Customization Architecture

This document defines how MathMasterHTML stores durable developer knowledge versus agent-facing execution hints.

## Ownership Model

| Layer | Files | Owns |
| --- | --- | --- |
| Developer-facing source of truth | `Docs/SystemDocs/*.md`, `Docs/Worms/*.md`, `README.md` | Runtime behavior, workflow rules, testing scenarios, durable subsystem knowledge |
| Workspace routing | `.github/copilot-instructions.md` | Repo-wide reminders that apply broadly plus links to the authoritative docs |
| Scoped agent wrappers | `.github/instructions/*.instructions.md` | File-scoped guardrails, source links, and validation expectations for common task surfaces |
| Execution artifacts | `docs/superpowers/plans/*.md`, `.github/superpower/plan/` | Task-specific plans; not authoritative behavior or workflow ownership |

## Source Of Truth Rules

1. Runtime and testing behavior belongs in `Docs/` and `README.md`, not in `.github/instructions/`.
2. `.github/copilot-instructions.md` stays minimal and repo-wide.
3. Scoped `.instructions.md` files are thin wrappers: scope, 3-6 non-negotiables, source links, and validation expectations.
4. If the same subsystem rule appears in both `Docs/` and `.github/`, the `Docs/` version is authoritative.

## Current Mapping

- General workflow and runtime conventions: `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- System boundaries and event flow: `Docs/SystemDocs/ARCHITECTURE.md`
- Performance expectations: `Docs/SystemDocs/PERFORMANCE.md`
- Worm runtime behavior: `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
- Worm testing scenarios: `Docs/Worms/WORM_TESTING_GUIDE.md`
- Repo-wide Copilot defaults: `.github/copilot-instructions.md`
- Runtime wrapper: `.github/instructions/gameplay-runtime.instructions.md`
- Worm wrapper: `.github/instructions/worm-runtime.instructions.md`
- Playwright wrapper: `.github/instructions/playwright-tests.instructions.md`

## Instruction Update Protocol

1. If runtime or test behavior changes, update the authoritative `Docs/` file first.
2. Update the matching `.instructions.md` file in the same change only when the agent-facing guardrails, source links, or validation expectations change.
3. Add a new scoped instruction file only after repeated evidence that one task surface needs unique, non-obvious rules.
4. Remove duplicated behavior detail from `.github/` when the same detail becomes durable documentation in `Docs/`.

## Review Checklist

- Does the behavior change live in the correct `Docs/` file?
- Does the matching `.instructions.md` file still read like a thin wrapper?
- Did a new subsystem rule get added to `.github/` when it should have been added to `Docs/`?
- Are the validation commands still aligned with `README.md` and the relevant subsystem guides?
```

- [ ] **Step 3: Link the new doc from the docs index and README**

```markdown
<!-- Docs/SystemDocs/_INDEX.md -->
- `AGENT_CUSTOMIZATION_ARCHITECTURE.md` - ownership model for workspace instructions, scoped instructions, and durable source-of-truth docs
```

```markdown
<!-- README.md -->
- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
```

- [ ] **Step 4: Re-run the gap audit to verify the new ownership model exists**

Run: `rg -n "AGENT_CUSTOMIZATION_ARCHITECTURE|Instruction Update Protocol|Source Of Truth Rules" Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md Docs/SystemDocs/_INDEX.md README.md`
Expected: matches in all three files, proving the new architecture doc is created and discoverable.

- [ ] **Step 5: Commit**

```bash
git add Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md Docs/SystemDocs/_INDEX.md README.md
git commit -m "docs: define agent customization architecture"
```

### Task 2: Convert The Workspace Instructions Into A Routing Layer

**Files:**

- Modify: `.github/copilot-instructions.md`
- Modify: `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`

- [ ] **Step 1: Audit the current workspace instruction for missing ownership guidance**

Run: `rg -n "Instruction Architecture|AGENT_CUSTOMIZATION_ARCHITECTURE|thin wrapper|source of truth" .github/copilot-instructions.md Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
Expected: no explicit instruction-architecture section or update rule exists yet.

- [ ] **Step 2: Add the customization architecture rule to the development guide**

```markdown
## Agent customization upkeep

- Durable runtime and testing behavior belongs in `Docs/` and `README.md`.
- `.github/copilot-instructions.md` should stay repo-wide and minimal.
- `.github/instructions/*.instructions.md` should stay thin wrappers with scope, guardrails, source links, and validation expectations.
- When behavior changes, update the authoritative docs first, then update the matching instruction wrapper only if the agent-facing guidance changed.

See `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md` for the ownership map and review checklist.
```

- [ ] **Step 3: Rewrite the workspace instruction file as a thin routing layer**

```markdown
# MathMasterHTML Workspace Instructions

Educational algebra game with a browser-native HTML/CSS/JS runtime. Script-tag load order, `window.*` globals, and DOM `CustomEvent` boundaries are part of the runtime model.

## Repo-Wide Defaults

- Active runtime pages live in `src/pages/`; root HTML files are redirect entrypoints.
- Keep browser-native script-tag boundaries intact when editing runtime files.
- Use `src/scripts/constants.js` and `src/scripts/constants.events.js` instead of ad hoc constants or event names.
- Panel A and Panel B sizing logic is owned by `src/scripts/display-manager.js`, not CSS overrides.
- Use `npm run verify` and `npm run typecheck` as the default validation baseline.

## Instruction Architecture

- Developer-facing behavior and workflow truth lives in `Docs/` and `README.md`.
- This file is the repo-wide routing layer only.
- File-scoped rules live under `.github/instructions/` and should remain thin wrappers.
- See `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md` for ownership and update protocol.

## Key References

- `README.md`
- `Docs/SystemDocs/_INDEX.md`
- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
- `Docs/SystemDocs/ARCHITECTURE.md`
- `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- `Docs/SystemDocs/PERFORMANCE.md`
- `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
- `Docs/Worms/WORM_TESTING_GUIDE.md`
```

- [ ] **Step 4: Verify the workspace instruction now advertises the routing model**

Run: `rg -n "Instruction Architecture|routing layer|AGENT_CUSTOMIZATION_ARCHITECTURE|repo-wide routing" .github/copilot-instructions.md Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
Expected: hits in both files showing the repo-wide instruction is explicitly documented as a routing layer.

- [ ] **Step 5: Commit**

```bash
git add .github/copilot-instructions.md Docs/SystemDocs/DEVELOPMENT_GUIDE.md
git commit -m "docs: make workspace instructions a routing layer"
```

### Task 3: Thin The Runtime And Worm Scoped Instructions

**Files:**

- Modify: `.github/instructions/gameplay-runtime.instructions.md`
- Modify: `.github/instructions/worm-runtime.instructions.md`
- Modify: `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
- Modify: `Docs/Worms/WORM_TESTING_GUIDE.md`

- [ ] **Step 1: Audit the scoped files for missing source-of-truth markers**

Run: `rg -n "Source Of Truth|Primary Sources|Authoritative" .github/instructions/gameplay-runtime.instructions.md .github/instructions/worm-runtime.instructions.md Docs/Worms/WORM_DEVELOPER_GUIDE.md Docs/Worms/WORM_TESTING_GUIDE.md`
Expected: the instruction files do not yet declare their source docs, and the worm docs do not yet explicitly state that they are authoritative.

- [ ] **Step 2: Rewrite the gameplay runtime wrapper as a thin instruction file**

```markdown
---
description: "Use when editing MathMasterHTML runtime gameplay scripts or page entrypoints. Covers event-driven integration, split-file boundaries, script load order, and runtime verification for src/scripts and src/pages."
name: "Gameplay Runtime Guidelines"
applyTo: "src/scripts/**/*.js, src/pages/**/*.html"
---
# Gameplay Runtime Guidelines

## Non-Negotiables

- Edit the active runtime pages in `src/pages/`; root HTML files are redirect entrypoints.
- Preserve script-tag load order, `window.*` exports, and DOM event boundaries.
- Add shared runtime event names in `src/scripts/constants.events.js`.
- Couple runtime behavior changes with the relevant Playwright coverage update.

## Primary Sources

- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
- `Docs/SystemDocs/ARCHITECTURE.md`
- `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- `Docs/SystemDocs/PERFORMANCE.md`

## Validate

- `npm run verify`
- `npm run typecheck`
- the relevant Playwright lane for the changed runtime surface
```

- [ ] **Step 3: Rewrite the worm wrapper and mark the worm docs as authoritative**

```markdown
<!-- .github/instructions/worm-runtime.instructions.md -->
---
description: "Use when editing MathMasterHTML worm runtime scripts or worm-related CSS. Covers spawn scaling, purple worm rules, reward idempotency, webdriver stability, and targeted validation for worm-system and worm-powerup work."
name: "Worm Runtime Guidelines"
applyTo: "src/scripts/worm*.js, src/scripts/worm/**/*.js, src/styles/**/*worm*.css"
---
# Worm Runtime Guidelines

## Non-Negotiables

- Preserve the purple-worm kill path and direct-click penalty.
- Keep reward and bonus flows idempotent.
- Maintain webdriver stability caps and pacing safeguards.
- Keep worm logic within the existing concern boundaries.

## Primary Sources

- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
- `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
- `Docs/Worms/WORM_TESTING_GUIDE.md`

## Validate

- `npm run verify`
- `npm run typecheck`
- the relevant focused worm Playwright coverage
```

```markdown
<!-- Docs/Worms/WORM_DEVELOPER_GUIDE.md -->
> This is the authoritative developer-facing source for worm runtime behavior. Keep `.github/instructions/worm-runtime.instructions.md` as a thin wrapper, not a duplicate spec.
```

```markdown
<!-- Docs/Worms/WORM_TESTING_GUIDE.md -->
> This is the authoritative developer-facing source for worm testing scenarios and validation paths. Keep `.github/instructions/playwright-tests.instructions.md` and `.github/instructions/worm-runtime.instructions.md` as thin wrappers, not duplicate test specs.
```

- [ ] **Step 4: Verify the scoped runtime and worm files now point to authoritative docs**

Run: `rg -n "Primary Sources|authoritative developer-facing source|thin wrapper" .github/instructions/gameplay-runtime.instructions.md .github/instructions/worm-runtime.instructions.md Docs/Worms/WORM_DEVELOPER_GUIDE.md Docs/Worms/WORM_TESTING_GUIDE.md`
Expected: matches in all four files showing explicit source-of-truth linkage and thin-wrapper language.

- [ ] **Step 5: Commit**

```bash
git add .github/instructions/gameplay-runtime.instructions.md .github/instructions/worm-runtime.instructions.md Docs/Worms/WORM_DEVELOPER_GUIDE.md Docs/Worms/WORM_TESTING_GUIDE.md
git commit -m "docs: thin runtime and worm instruction wrappers"
```

### Task 4: Thin The Playwright Wrapper And Validate The New Architecture

**Files:**

- Modify: `.github/instructions/playwright-tests.instructions.md`
- Modify: `README.md`
- Modify: `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`

- [ ] **Step 1: Audit the Playwright wrapper for missing source links and update protocol alignment**

Run: `rg -n "Primary Sources|AGENT_CUSTOMIZATION_ARCHITECTURE|thin wrapper|competition lanes" .github/instructions/playwright-tests.instructions.md Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md README.md`
Expected: the new architecture doc exists, but the Playwright wrapper does not yet use the same thin-wrapper structure or source-link wording.

- [ ] **Step 2: Rewrite the Playwright wrapper and align the README docs set**

```markdown
---
description: "Use when editing MathMasterHTML Playwright specs. Covers real runtime entrypoints, focused lane selection, mobile and competition expectations, and keeping tests aligned with the event-driven browser runtime."
name: "Playwright Test Guidelines"
applyTo: "tests/**/*.spec.js"
---
# Playwright Test Guidelines

## Non-Negotiables

- Use the real runtime entrypoints under `src/pages/` unless the redirect itself is under test.
- Match the lane to the change: focused Chromium first, device or mobile projects for layout/touch work, competition lanes for broader gameplay readiness.
- Keep assertions aligned with visible runtime behavior and documented event outcomes.
- Update the affected test coverage in the same change when runtime URLs, contracts, or readiness behavior change.

## Primary Sources

- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
- `README.md`
- `Docs/SystemDocs/PERFORMANCE.md`
- `Docs/Worms/WORM_TESTING_GUIDE.md`

## Validate

- `npm run verify`
- `npm run typecheck`
- the focused Playwright command or competition lane that matches the change
```

```markdown
<!-- README.md -->
- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
```

- [ ] **Step 3: Run the full documentation validation pass**

Run: `npm run verify`
Expected: PASS with no doc-path, lint, or line-limit regressions introduced by the new architecture files.

- [ ] **Step 4: Run the repo-standard typecheck pass**

Run: `npm run typecheck`
Expected: PASS unchanged, confirming the documentation redesign did not introduce unrelated workspace regressions.

- [ ] **Step 5: Commit**

```bash
git add .github/instructions/playwright-tests.instructions.md README.md Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md
git commit -m "docs: align playwright instructions with architecture"
```

## Self-Review

- Spec coverage: this plan addresses the approved redesign themes directly by defining a single source of truth, reducing instruction overlap, designating authoritative worm docs, and adding an update protocol.
- Placeholder scan: all tasks contain exact files, snippets, commands, and expected outcomes; no `TBD`, `TODO`, or deferred implementation placeholders remain.
- Type consistency: the plan uses one consistent ownership model everywhere: `Docs/` are authoritative, `.github/copilot-instructions.md` is the repo-wide routing layer, and `.github/instructions/*.instructions.md` are thin wrappers.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-07-agent-customization-architecture-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using the `executing-plans` agent, batch execution with checkpoints

**Which approach?**
