# User Journey: Welcome → Level Select Onboarding

## User Persona

- **Who:** Competitive algebra student (8–80 age range, introverted intellectual)
- **Goal:** Begin Math Master and feel immersed in a sophisticated, powerful training system
- **Context:** First launch, desktop or touch device, any time of day
- **Success Metric:** User feels the welcome and level select are cohesive, premium, and intentional—not disconnected.

## User Journey Stages

### Stage 1: "Arrival" — Web Browser Loads Welcome Page

**Doing:**

- User types URL or taps link
- Page loads and displays welcome screen
- User observes visual design for 2–5 seconds

**Thinking:**

- "What kind of game is this? Amateur or professional?"
- "Does this match the gameplay style I saw in the description?"
- "Is this serious math content or a gimmick?"

**Feeling:**

- Curiosity (hopeful)
- Mild skepticism (educational games are often "fluffy")

**Current Pain Points:**

- Bright neon green + thick yellow glow reads as "1990s arcade," not "sophisticated training"
- Visual clash with level-select vibe (user may have seen a screenshot) creates doubt
- Marcus Aurelius quote feels misaligned with bright, flashy design

**Opportunity:**

- **Design for premium first impression.** Use dark, refined aesthetics to signal: "This is serious, well-designed, thoughtfully made."
- **Align quote with visual narrative.** If the design looks sophisticated, the virtue message lands harder. "If it's not right, do not say it" becomes the _principle_ of a training system, not a random philosophy.

---

### Stage 2: "Immersion" — User Reads the Hero + Quote

**Doing:**

- User reads "MATH MASTER" title
- User observes logo (scale, X/Y variables)
- User reads Marcus Aurelius quote
- User looks for next action button

**Thinking:**

- "Is this game actually challenging? Or is it watered down?"
- "Why that quote? What does it tell me about the game's philosophy?"
- "What happens when I click?"

**Feeling:**

- Engagement (if design feels premium)
- OR dismissal (if design feels cheap)

**Current Pain Points:**

- Bright neon undermines the seriousness of the quote
- Quote tone (philosophical, restraint-focused) conflicts with design tone (flashy, attention-grabbing)
- User sees "Click to continue" as transactional, not inviting

**Opportunity:**

- **Use dark + subtle color to elevate the quote.** White/cream text on dark background, with the quote as the _hero_ content, not secondary
- **Tie logo to the "danger + virtue" theme.** Scale = balance. X/Y variables = solving the right equation. The visual reinforces the philosophy.
- **Replace "Click to continue" with mission language.** "Enter the system" or "Begin training" feels more aligned with "dangerous but choosing virtue" archetype.

---

### Stage 3: "Transition" — User Advances from Welcome → Level Select

**Doing:**

- User clicks continue button
- Page navigates to level select
- User sees three routes (Beginner, Warrior, Master)

**Thinking:**

- "Oh! Now I see the real game interface. Does it match what I just saw?"
- "Is this consistent? Or did I just enter a different game?"

**Feeling:**

- Cohesion (if colors, fonts, and tone match welcome)
- OR whiplash (if they're drastically different)

**Current Pain Points:**

- **CRITICAL:** Bright neon welcome → dark refined level select feels like two different products
- User may wonder: "Was the welcome screen old/outdated? Why the sudden change?"
- Visual discontinuity damages perception of quality and intentionality

**Opportunity:**

- Unified color palette across both pages signals cohesive design
- Same fonts (Alegreya Sans body, IBM Plex Mono accent) throughout
- Consistent gradient/texture language
- **Continuity = trust.** If the visual system is consistent, users trust the game is well-made

---

### Stage 4: "Commitment" — User Selects a Route

**Doing:**

- User reads route descriptions ("Build the habit", "Shift into blended arithmetic", "The final drill")
- User sees stats (50 problems, symbol set, pace, progress)
- User selects a route

**Thinking:**

- "This is real. I'm about to play something challenging."
- "Do I feel ready? Excited?"

**Feeling:**

- If welcome felt cohesive: motivated, ready
- If welcome felt disconnected: uncertain, less invested

## Key Accessibility Layers

### Keyboard Navigation

- All pathways (welcome → level select → game) accessible via Tab
- Enter/Space activates buttons
- Visual focus indicators match the dark theme (phosphor green outline)

### Screen Reader

- Quote is marked as meaningful content (`<blockquote>` semantic)
- Logo container has descriptive aria-label: "Math Master logo with scale and variable symbols"
- "Continue" button has clear purpose: "Begin training"

### Visual Accessibility

- Text contrast: dark background (#0d100f) + cream text (#ebe5d8) = 18:1 ratio (WCAG AAA)
- Interactive targets: buttons 44×44px minimum (touch-friendly)
- Reduced motion: logo animations pause if `prefers-reduced-motion`

### Cross-Device

- Desktop (mouse): full visual polish, smooth hover states
- Touch (tablet/mobile): touch targets 48×48px, no hover-only info, fast feedback

## Success Indicators

✓ User sees welcome and thinks: "This looks intentional and premium."  
✓ User reads Marcus Aurelius quote and thinks: "That matches the design tone."  
✓ User navigates to level select and thinks: "Same system, next level."  
✓ User commits to a route feeling: ready, motivated, not confused.
