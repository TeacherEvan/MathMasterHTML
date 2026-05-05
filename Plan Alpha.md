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
- unrevealed solution symbols must stay non-readable until explicitly revealed; visual hiding alone does not meet the gameplay-integrity bar

### Platform Priority Policy

- Android WebView is the top acceptance target
- touch-first ergonomics beat desktop-first assumptions
- desktop should feel like the expanded premium version, not the design source of truth
- if a desktop-specific capability weakens mobile gameplay, trim the desktop affordance first
- touch interactions must preserve assistive and programmatic activation parity; anti-ghosting logic cannot block legitimate synthetic clicks or screen-reader activation

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
- compact-console overlap fixes must come from console-owned clearance, not panel dimension changes

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

## Welcome Surface Contract

- The welcome page is the training-dossier ingress, not a separate arcade-style splash screen.
- Welcome and level select should read as the same product world: dark ink structure, restrained phosphor signal, brass or ember accents, and calm briefing language.
- The Marcus Aurelius quote remains on the welcome surface, but it should be framed as the core principle of the training system rather than a decorative epigraph.
- Orbitron stays reserved for the hero title and HUD-like labels; supporting welcome copy should favor the calmer dossier mix already used by the premium route surfaces.
- The welcome page should keep one clear primary action, keep local utilities secondary, and avoid noisy glow stacks that compete with the CTA.
- Visual continuity matters more than novelty here: remove welcome-to-level-select whiplash before chasing extra effects.

## Current UX Decisions

- welcome, level select, and gameplay must all preserve full-screen play ergonomics
- local profile naming is acceptable and device-scoped
- tutorial content should stay deterministic
- generated algebra is not the current UX priority

## Design Context

### Users

- Primary users are solo algebra learners, especially teens and adult self-learners, with classroom and tutoring use as secondary contexts.
- The core job is to turn equation solving into a fast, high-feedback practice loop that feels active and rewarding instead of static or school-like.
- Mobile is the priority platform. Design decisions should assume touch-first play in constrained handheld contexts before considering desktop expansion.
- Desktop remains supported, but desktop-only affordances can be reduced when they compromise mobile clarity, pacing, or control quality.

### Brand Personality

- Futuristic
- Smooth
- Disciplined

The interface should feel confident, premium, and slightly ominous: more elite training chamber than classroom worksheet. It should preserve the existing training-console identity while adding a darker, more cinematic edge.

### Aesthetic Direction

- Dark-first premium sci-fi console is the canonical direction, with light mode supported only when it remains intentional and equally readable.
- Matrix DNA stays present through symbol rain, phosphor signal cues, and system-like typography, but the overall feel should remain cleaner and more controlled than retro-terminal cosplay.
- Visual tone should lean toward dark-force energy: severe, cinematic, restrained, and powerful rather than loud, messy, or neon-for-neon's-sake.
- Existing route accents remain the functional palette: phosphor for active/success states, brass for emphasis and progression, ember for danger or elite-route intensity.

### Design Principles

- Mobile gameplay authority: protect touch ergonomics, readability, and reaction flow before preserving desktop-specific polish.
- Cinematic restraint: create atmosphere with composition, contrast, and motion discipline rather than clutter, gimmicks, or generic sci-fi effects.
- Functional intensity: every glow, accent, animation, and texture should reinforce state, progress, or tension in the training loop.
- Premium clarity under pressure: interfaces must stay legible and navigable even during active play, with concise copy and strong hierarchy.
- Practical accessibility: reduced motion, clear focus states, non-color cues, and touch-safe targets are part of the visual quality bar, not add-ons.

### Welcome-Specific Opportunity

- Current debt: the welcome page still risks feeling brighter and more promotional than the darker level-select dossier that follows it.
- Desired effect: the first screen should feel like entering a serious training console for competitive algebra, not a generic neon landing page.
- Immediate translation: use briefing-style copy, core-principle framing, and restrained atmosphere so the handoff into route selection feels intentional.

## Consolidation Record

Alpha absorbed the old content from:

- `task.md`
- `.github/superpower/ux/*.md`
- `.github/superpower/context/2026-04-07-design-unification-context-map.md`
- `.github/superpower/ux/welcome-sith-aesthetic-jtbd.md`
- `.github/superpower/ux/welcome-sith-aesthetic-journey.md`
- `.github/superpower/ux/welcome-sith-aesthetic-flow.md`

Those deleted files were exploratory or design-source inputs. Alpha is now the maintained design contract.