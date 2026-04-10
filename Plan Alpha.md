# Plan Alpha

## Purpose

Plan Alpha is the product, UX, and design source of truth. It absorbs the old task brief, UX research artifacts, and aesthetic/context maps.

## Users

- Primary audience: solo algebra learners, especially teens and adult self-learners.
- Primary context: home self-study first; classroom and tutoring second.
- Primary device priority: mobile and Android WebView before desktop polish.

## Product Job

Turn equation solving into a high-feedback drill where falling symbols reveal solution steps line by line and the player feels momentum rather than friction.

## Emotional Arc

- start confident
- build flow through visible progress
- finish with a sense of mastery and reward

## Brand Personality

- Futuristic
- Innovative
- Smooth

The interface should feel like a premium training console, not a toy, not a noisy arcade cabinet, and not a generic school dashboard.

## Design Direction

- refined sci-fi training console
- Matrix DNA retained, but cleaner and more premium
- dark mode is the canonical quality bar
- light mode is supported intentionally, not as an afterthought
- avoid generic purple-blue neon and glassmorphism clutter

## Signature Interaction

The identity moment is the rhythm between falling symbol rain and line-by-line algebra reveal.

## Product Rules

### Tutorial Policy

- there is exactly one H2P level
- H2P is not the whole Beginner route
- H2P should demonstrate the game clearly, then get out of the way

### Gameplay Integrity Policy

- active gameplay should stay a puzzle
- in-app exits or bypasses should not let the player abandon unresolved puzzle flow without intent
- once the problem is complete, those controls should become available again immediately

### Platform Priority Policy

- Android WebView is the top acceptance target
- touch-first ergonomics beat desktop-first assumptions
- desktop should feel like the expanded premium version, not the design source of truth

## Color System

### Structural Palette

- use olive-leaning dark neutrals and warm copy colors for surfaces
- use phosphor, brass, and ember as route-level accents
- reserve raw neon effects for gameplay feedback, not whole-screen structure

### Current Route Accents

- Beginner: phosphor green
- Warrior: brass/gold
- Master: ember

### Effects Palette

- green for success and active symbol identity
- gold for achievements and high-value highlights
- red for danger or wrong-answer urgency
- cyan for completed-row symbol effects

## Typography

- Orbitron for display headings and HUD labels only
- Exo 2 for body copy and readable interface text
- Alegreya Sans and IBM Plex Mono remain valid for level-select and data-style surfaces
- use clear hierarchy through weight and size, not just color

## Motion

- use transform and opacity rather than layout-changing animation
- favor decisive easing, not bounce or elastic motion
- reduced motion support is mandatory
- entrance animation must degrade to fully visible static content under reduced motion

## Layout Rules

- keep the three-panel gameplay composition intact
- maintain clear separation between problem display, solution/worm action, and symbol rain
- use fluid spacing through `clamp()` on responsive surfaces
- prioritize readable touch targets and non-overlapping HUD zones

## Accessibility

- AA minimum, AAA where practical
- strong focus-visible states on interactive controls
- non-color cues for state changes
- minimum 44x44 touch targets
- keyboard equivalence where the surface permits it

## Content and Messaging Rules

- copy should be concise and confidence-building
- the game should sound capable and polished, not childish or chaotic
- small-screen copy must stay shorter than desktop copy when both exist

## Active UX Quality Bar

The level-select screen remains the benchmark for premium clarity: route identity, legibility, and restrained polish should pull the welcome and gameplay surfaces upward.

## Current UX Decisions

- welcome, level select, and gameplay must all preserve full-screen play ergonomics
- local profile naming is acceptable and device-scoped
- tutorial content should stay deterministic
- generated algebra is not the current UX priority

## Consolidation Record

Alpha absorbed the old content from:

- `task.md`
- `.github/superpower/ux/*.md`
- `.github/superpower/context/2026-04-07-design-unification-context-map.md`

Those deleted files were exploratory or design-source inputs. Alpha is now the maintained design contract.