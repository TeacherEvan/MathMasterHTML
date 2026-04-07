# Agent Customization Architecture

This document defines how MathMasterHTML separates durable developer-facing knowledge from agent-facing execution guidance.

## Ownership Model

| Layer | Files | Owns |
| --- | --- | --- |
| Developer-facing source of truth | `Docs/SystemDocs/*.md`, `Docs/Worms/*.md`, `README.md` | Runtime behavior, workflow rules, testing scenarios, and durable subsystem knowledge |
| Workspace routing | `.github/copilot-instructions.md` | Repo-wide reminders plus links that route agents to the authoritative docs |
| Scoped agent wrappers | `.github/instructions/gameplay-runtime.instructions.md`, `.github/instructions/worm-runtime.instructions.md`, `.github/instructions/playwright-tests.instructions.md` | File-scoped guardrails, source links, and validation expectations for common task surfaces |
| Execution artifacts | `docs/superpowers/plans/*.md`, `.github/superpower/plan/`, `.github/superpower/context/`, `JOBCARD.md` | Task-specific planning and execution context; not authoritative behavior or workflow ownership |

## Source Of Truth Rules

1. Runtime and testing behavior belongs in `Docs/` and `README.md`, not in `.github/instructions/`.
2. `.github/copilot-instructions.md` stays minimal and repo-wide.
3. Scoped `.instructions.md` files stay thin wrappers: scope, a short list of non-negotiables, source links, and validation expectations.
4. If the same subsystem rule appears in both `Docs/` and `.github/`, the `Docs/` version is authoritative.
5. Plans, context maps, and jobcards document work in motion; they do not replace the durable docs set.

The current documentation catalog lives in `Docs/SystemDocs/_INDEX.md`. Keep this document focused on ownership boundaries and update protocol rather than mirroring the live file map.

## Instruction Update Protocol

1. If runtime or test behavior changes, update the authoritative `Docs/` file first.
2. Update the matching `.instructions.md` file in the same change only when the agent-facing non-negotiables, source links, or validation expectations change.
3. Add a new scoped instruction file only after repeated evidence that a task surface needs unique, non-obvious guidance.
4. Remove duplicated behavior detail from `.github/` when the same detail becomes durable documentation in `Docs/`.
5. Keep `Docs/SystemDocs/_INDEX.md` current, and update `README.md` only when its entry-point pointers need to change.

## Review Checklist

- Does the behavior change live in the correct `Docs/` file?
- Does the matching `.instructions.md` file still read like a thin wrapper?
- Did a new subsystem rule get added to `.github/` when it should have been added to `Docs/`?
- Are the validation commands still aligned with `README.md` and the relevant subsystem guides?
- Do plan files or jobcards contain durable rules that should be promoted into the living docs set?
