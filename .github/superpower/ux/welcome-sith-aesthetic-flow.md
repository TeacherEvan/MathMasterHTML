# User Flow Specification: Welcome Page Redesign (Sith Aesthetic)

## Entry Point

**Current:** User arrives at `/src/pages/index.html` or `/` (root redirects here)  
**Action:** Page loads and displays welcome screen

---

## Flow Steps

### Step 1: Page Load & Visual Foundation

**Screen Name:** Welcome Page Hero

**What It Shows:**

- Full-viewport dark background with subtle gradients (matching level-select palette)
- Matrix rain effect in background (low opacity, matching level-select style)
- Centered hero content:
  - Logo (scale icon + X/Y variables)
  - "MATH MASTER" title
  - Subtitle: "Unlock Your Mind"
  - Marcus Aurelius quote (Hero content, not secondary)
  - Call-to-action button: "Begin Training" or "Enter the System"
  - Creator credit: "Created by Teacher Evan"

**Color Palette (from level-select.polish.css):**

- Background: Dark ink tokens (#0d100f → #080b0a)
- Text primary: #ebe5d8 (cream/off-white)
- Text secondary: #c2c8bf
- Accent: #8ecb75 (phosphor green, muted)
- Accent secondary: #c7a44c (brass gold)

**Typography:**

- Display: Alegreya Sans 700–800 weight (matches level-select header)
- Body: IBM Plex Mono 400–500 (matches level-select technical feel)
- Quote: Alegreya Sans 500 italic (elegant, not flashy)

**Animations:**

- Logo: Subtle rotation + scale, ~6s duration (reduced-motion: none)
- Floating math symbols: Float animation, 8s cycle (reduced-motion: none)
- Background gradient: Optional very subtle pulse (reduced-motion: none)

**Primary Action:**

- Button: "Begin Training" (or "Enter the System")
- Style: Subtle phosphor green border or brass gold underline (NOT glowing)
- Hover: Slight color shift to gold or subtle scale (NOT aggressive glow)
- Touch: Minimum 48×48px target, instant feedback (no hover delay)

---

### Step 2: User Reads Content

**Thinking/Feeling:**

- User reads "MATH MASTER" title → establishes what this is
- User observes scale logo → subconsciously registers "balance, precision" (ties to Marcus Aurelius virtue message)
- User reads Marcus Aurelius quote → understands the principle: "If it is not right, do not say it" = "If your learning isn't authentic, don't pretend"
- User sees dark, refined design → thinks "This is premium, intentional, serious."

**Design Principles:**

1. **Progressive Disclosure:** Hero title → logo → quote → button (top to bottom, natural read flow)
2. **Contextual Alignment:** Logo imagery (scale/balance) + quote (virtue/principle) + Sith aesthetic (power + choice) = coherent narrative
3. **Restraint:** No bright glows, no flashy effects. Let typography and color subtlety do the work.

---

### Step 3: User Interacts with Button

**Doing:**

- User clicks or taps "Begin Training" button
- Button provides immediate visual feedback (state change)
- Page transitions to level-select

**Button States:**

| State            | Style                                                              | Interaction                     |
| ---------------- | ------------------------------------------------------------------ | ------------------------------- |
| Default          | Phosphor green border or brass text on dark background, cream text | Visible, quiet confidence       |
| Hover (desktop)  | Border/text shifts to gold, subtle scale ~1.02                     | Smooth transition, ~100ms       |
| Active (pressed) | Brief color flash (gold → phosphor), scale ~0.98                   | Tactile feedback                |
| Touch            | Ripple effect from touch point (phosphor green, ~200ms fade)       | Standard Material Design ripple |

---

## Exit Points

### Success: User Clicks "Begin Training"

**Outcome:** Route to level-select.html  
**UX:** Smooth page transition (fade or slide, < 300ms)

### Partial: User Scrolls/Explores

**If applicable:** Button remains sticky/accessible  
**Outcome:** User can return to button anytime

### Blocked: If Page Fails to Load

**Error Recovery:**

- Show fallback message: "Training system loading..."
- Retry button available
- Service worker caching ensures offline access (if PWA enabled)

---

## Accessibility Requirements

### Keyboard Navigation

| Key           | Action                             |
| ------------- | ---------------------------------- |
| Tab           | Move focus to button               |
| Enter / Space | Activate button                    |
| Escape        | (Optional) Return to previous page |

**Visual Focus Indicator:**

- Focus ring: 2–3px phosphor green (#8ecb75) outline
- Offset: 4px from button edge
- Visible at all times (no keyboard + mouse hover confusion)

### Screen Reader

**Semantic Structure:**

```html
<header role="banner">
  <h1>MATH MASTER</h1>
  <p>Unlock Your Mind</p>
</header>

<main role="main">
  <figure>
    <div><!-- Logo SVG or emoji --></div>
    <figcaption>Math Master symbol: scale and variables</figcaption>
  </figure>

  <blockquote>
    <p>If it is not right, do not do it; if it is not true, do not say it.</p>
    <footer>— Marcus Aurelius</footer>
  </blockquote>

  <button>Begin Training</button>
</main>
```

**Announcements:**

- Page title: "Math Master — Welcome"
- H1 establishes page landmark
- Quote is semantically `<blockquote>` (meaningful content, not decoration)
- Button has clear purpose text: "Begin Training"

### Visual Accessibility

| Requirement        | Implementation                                            |
| ------------------ | --------------------------------------------------------- |
| Text Contrast      | Dark (#0d100f) + cream (#ebe5d8): 18:1 ratio (WCAG AAA)   |
| Color Independence | Don't use color alone to communicate; pair with icon/text |
| Text Resize        | Layout remains usable at 200% zoom (no horizontal scroll) |
| Interactive Target | Button: 48×48px minimum (both desktop and touch)          |
| Icon Clarity       | Logo styled with clear strokes, good visual weight        |

### Reduced Motion

**CSS:**

```css
@media (prefers-reduced-motion: reduce) {
  .logo {
    animation: none;
  }
  .floating-symbol {
    animation: none;
  }
  .button {
    transition: none;
  }
  .button:hover {
    transform: none;
  }
}
```

**Design Impact:** Page still looks good with no animations (animations are enhancement, not core to usability)

---

## Visual Specifications

### Colors (CSS Variables)

```css
--welcome-bg-primary: #0d100f; /* Dark ink from level-select */
--welcome-bg-accent: #080b0a; /* Darker accent */
--welcome-text-primary: #ebe5d8; /* Cream/off-white */
--welcome-text-secondary: #c2c8bf; /* Muted cream */
--welcome-accent-primary: #8ecb75; /* Phosphor green */
--welcome-accent-secondary: #c7a44c; /* Brass gold */
--welcome-text-mono: #90978f; /* Gray mono text */
```

### Typography Scale

| Element       | Font          | Size                          | Weight | Line Height |
| ------------- | ------------- | ----------------------------- | ------ | ----------- |
| H1 (Title)    | Alegreya Sans | clamp(2.9rem, 8vw, 5.9rem)    | 800    | 0.9         |
| H2 (Subtitle) | Alegreya Sans | clamp(1.1rem, 2.6vw, 1.75rem) | 700    | 1.1         |
| Quote         | IBM Plex Mono | 1rem                          | 400    | 1.6         |
| Attribution   | IBM Plex Mono | 0.85rem                       | 400    | 1.4         |
| Button        | Alegreya Sans | 1.1rem                        | 700    | 1.2         |

### Layout

**Desktop (1024px+):**

- Centered container
- Max-width: ~600px
- Vertical spacing between elements: clamp(1.5rem, 4vw, 3rem)
- Logo: 140×140px (responsive scale to 100px on tablet)

**Tablet (768px–1024px):**

- Same centered layout
- Vertical padding: 2rem top/bottom
- Logo: 100–120px

**Mobile (< 768px):**

- Full-width (respects safe area insets)
- Padding: 1.5rem horizontal
- Logo: 80px
- Adjust font sizes with clamp() to stay readable

---

## Interaction Design Details

### Button Behavior

**Default State:**

- Subtle border in phosphor green OR brass text with underline
- No shadow, no glow
- Calm, intentional

**Hover (Desktop):**

- Border shifts to brass (or text becomes gold)
- Very subtle scale: `transform: scale(1.02)`
- Transition: `cubic-bezier(0.34, 1.56, 0.64, 1)` (smooth, not bouncy)

**Active (Pressed):**

- Scale down very slightly: `scale(0.98)`
- Flash of color (green → gold)
- Duration: ~50ms

**Touch:**

- Ripple effect originates from touch point
- Color: phosphor green at 30% opacity
- Duration: 200ms fade

### Page Transition (Welcome → Level Select)

**Option 1: Fade (Recommended)**

- Current page fades out (opacity: 1 → 0, 200ms)
- Next page fades in (opacity: 0 → 1, 200ms)
- Easing: cubic-bezier(0.4, 0, 0.2, 1) (ease-in-out)

**Option 2: Slide**

- Current page slides left (translateX: 0 → -100%, 300ms)
- Next page slides in from right (translateX: 100% → 0, 300ms)
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (smooth out)

---

## Design Tokens Summary

| Token                    | Value                        | Purpose                      |
| ------------------------ | ---------------------------- | ---------------------------- |
| Color.Background.Primary | #0d100f                      | Main page background         |
| Color.Text.Primary       | #ebe5d8                      | Readable text, high contrast |
| Color.Accent.Phosphor    | #8ecb75                      | Interactive UI, focus states |
| Color.Accent.Brass       | #c7a44c                      | Secondary accent, warmth     |
| Motion.Duration.Fast     | 100–200ms                    | Hover, focus feedback        |
| Motion.Duration.Medium   | 300ms                        | Page transitions             |
| Motion.Easing.Smooth     | cubic-bezier(0.4, 0, 0.2, 1) | Standard ease-in-out         |

---

## Next Steps for Designer

1. **Create Figma mockup** using these tokens and specifications
2. **Validate contrast** in Figma (text and interactive elements)
3. **Test reduced-motion** variant to ensure animations disable cleanly
4. **Responsive testing** at 375px, 768px, 1024px breakpoints
5. **Hand off to developer** with component specifications

---

## Design Handoff Checklist

- [ ] Color palette finalized in CSS variables
- [ ] Typography scale confirmed (desktop + mobile)
- [ ] Button states designed (default, hover, active, disabled, focus)
- [ ] SVG logo finalized (or emoji alternative)
- [ ] Accessibility contrast tested (18:1 minimum)
- [ ] Reduced-motion variant confirmed
- [ ] Touch target sizes confirmed (48×48px minimum)
- [ ] Page transition animation chosen (fade or slide)
- [ ] Figma component library created
- [ ] Developer receives static Figma + specifications
