# Post-Merge Branch And Worktree Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove stale merged worktrees and branches from the PR `#71` integration cycle without deleting the preserved local-main safety branch or the active level-select follow-up worktree.

**Architecture:** Cleanup should be conservative and state-driven. First verify that the only active non-merged surfaces are `safety/local-main-console-reward-activation` and the dirty `feature/level-select-compact-route-followup` worktree. Then remove clean stale worktrees, delete their corresponding merged branches, and stop before rewriting local `main`.

**Tech Stack:** Git refs, git worktrees, and branch classification against `origin/main`.

---

## File Structure

- Verify Only: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML`
  Responsibility: root repo that currently has local `main` diverged from `origin/main`.
- Verify Only: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels`
  Responsibility: active worktree that must be preserved because it now carries `feature/level-select-compact-route-followup` plus uncommitted changes.
- Remove Worktree: `/home/ewaldt/.config/superpowers/worktrees/MathMasterHTML/agent-customization-architecture-redesign`
  Responsibility: merged docs worktree with no active changes.
- Remove Worktree: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/landing-perf-stability-2026-04-07`
  Responsibility: merged landing branch worktree with no active changes.
- Remove Worktree: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/perf-stability-implementation`
  Responsibility: merged perf branch worktree with no active changes.
- Remove Worktree: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/testing-four-branches-2026-04-07`
  Responsibility: merged integration testing worktree whose remote branch is already gone.

## Design Constraints

- Keep `feature/level-select-compact-route-followup` and its dirty worktree.
- Keep `safety/local-main-console-reward-activation`.
- Do not delete or rewrite local `main` in this cleanup pass.
- Remove worktrees before deleting the branches they have locked.

## Out Of Scope

- Cherry-picking the local-main console follow-up onto a fresh branch.
- Committing the dirty level-select follow-up patch.
- Hard-resetting `main` to `origin/main`.

### Task 1: Preflight The Cleanup And Preserve The Only Active Work

**Files:**
- Verify Only: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML`
- Verify Only: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels`

- [ ] **Step 1: Refresh refs and verify the repo still matches the reviewed state**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML fetch origin --prune`
Expected: remote `origin/main` remains at PR `#71` merge commit `0e9fbeb`, and the deleted remote integration branch stays gone.

- [ ] **Step 2: Verify the two preserved surfaces before deleting anything**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML status --short --branch && printf '\n---\n' && git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels status --short --branch`
Expected:
- root repo shows `## main...origin/main [ahead 1, behind 11]`
- level-select worktree shows `## feature/level-select-compact-route-followup` plus its seven modified files.

- [ ] **Step 3: Verify the safety branch exists before continuing**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML branch --list safety/local-main-console-reward-activation`
Expected: one line containing `safety/local-main-console-reward-activation`.

### Task 2: Remove Clean Stale Worktrees

**Files:**
- Remove Worktree: `/home/ewaldt/.config/superpowers/worktrees/MathMasterHTML/agent-customization-architecture-redesign`
- Remove Worktree: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/landing-perf-stability-2026-04-07`
- Remove Worktree: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/perf-stability-implementation`
- Remove Worktree: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/testing-four-branches-2026-04-07`

- [ ] **Step 1: Reconfirm each stale worktree is clean before removal**

Run: `git -C /home/ewaldt/.config/superpowers/worktrees/MathMasterHTML/agent-customization-architecture-redesign status --short --branch && printf '\n---\n' && git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/landing-perf-stability-2026-04-07 status --short --branch && printf '\n---\n' && git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/perf-stability-implementation status --short --branch && printf '\n---\n' && git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/testing-four-branches-2026-04-07 status --short --branch`
Expected: no modified files in any of the four worktrees.

- [ ] **Step 2: Remove the merged worktrees in one pass**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML worktree remove \
  /home/ewaldt/.config/superpowers/worktrees/MathMasterHTML/agent-customization-architecture-redesign
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML worktree remove \
  /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/landing-perf-stability-2026-04-07
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML worktree remove \
  /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/perf-stability-implementation
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML worktree remove \
  /home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/testing-four-branches-2026-04-07
```

- [ ] **Step 3: Verify only the root repo and active level-select follow-up worktree remain**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML worktree list`
Expected: exactly two entries remain:
- `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML [main]`
- `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML/.worktrees/level-select-rog-compact-panels [feature/level-select-compact-route-followup]`

### Task 3: Delete The Merged Branches That No Longer Carry Active Work

**Files:**
- Delete Branch: `docs/agent-customization-architecture-redesign`
- Delete Branch: `feature/level-select-rog-compact-panels`
- Delete Branch: `feature/perf-stability-implementation`
- Delete Branch: `integration/testing-four-branches-2026-04-07`
- Delete Branch: `landing/perf-stability-2026-04-07`

- [ ] **Step 1: Verify each target branch is merged into `origin/main`**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML branch --merged origin/main`
Expected: includes all five target branches, and also includes `feature/level-select-compact-route-followup` only because its tip commit is merged even though its worktree still has uncommitted follow-up changes.

- [ ] **Step 2: Delete only the stale merged branch names, not the preserved active or safety branches**

```bash
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML branch -d docs/agent-customization-architecture-redesign
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML branch -d feature/level-select-rog-compact-panels
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML branch -d feature/perf-stability-implementation
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML branch -d integration/testing-four-branches-2026-04-07
git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML branch -d landing/perf-stability-2026-04-07
```

- [ ] **Step 3: Re-list branches to confirm the preserved set remains intact**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML for-each-ref refs/heads --format='%(refname:short)' | sort`
Expected: still includes `main`, `safety/local-main-console-reward-activation`, and `feature/level-select-compact-route-followup`, while the five deleted stale branch names are gone.

### Task 4: Stop Before Rewriting Local `main`

**Files:**
- Verify Only: `/home/ewaldt/Documents/VS/GAMES/MathMasterHTML`

- [ ] **Step 1: Record the remaining local-main divergence explicitly**

Run: `git -C /home/ewaldt/Documents/VS/GAMES/MathMasterHTML rev-list --left-right --count main...origin/main`
Expected: `1 11` until the console follow-up is replayed from the safety branch and explicit approval is given for any `main` reset.

- [ ] **Step 2: Leave `main` untouched and hand off to the console follow-up plan**

```text
Do not run `git reset --hard origin/main` in this cleanup plan.
Use the separate console follow-up plan to move commit 3708ec5 onto a fresh branch first.
```
