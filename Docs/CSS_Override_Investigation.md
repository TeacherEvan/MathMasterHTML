# CSS Override Investigation - Panel A & B Font Size Issues

**Date**: October 6, 2025  
**Issue**: CSS changes to Panel A and Panel B font sizes have no effect on mobile  
**Root Cause**: JavaScript inline style overrides

## Problem Summary

When developers attempt to modify mobile font sizes for Panel A (`#problem-container`) and Panel B (`#solution-container`) using CSS rules like:

```css
.res-mobile #problem-container {
    font-size: 12px; /* ❌ This has NO EFFECT */
}

.res-mobile #solution-container {
    font-size: 14px; /* ❌ This has NO EFFECT */
}
```

These changes are **completely ignored** because JavaScript applies inline styles that override CSS rules.

## The CSS Specificity Problem

### CSS Specificity Hierarchy (Lowest to Highest)

1. ~~External stylesheet~~ (overridden by inline)
2. ~~Internal `<style>` tags~~ (overridden by inline)
3. ~~CSS rules with selectors~~ (overridden by inline)
4. ~~CSS `!important` rules~~ (can be overridden by inline `!important`)
5. **Inline styles via JavaScript** ← **ALWAYS WINS**

### Why Inline Styles Win

When JavaScript executes:

```javascript
element.style.fontSize = '12px';
```

This creates an inline style attribute:

```html
<div id="problem-container" style="font-size: 12px;">...</div>
```

This inline style has **higher specificity** than ANY CSS rule, including:

- `.res-mobile #problem-container { font-size: 20px; }`
- `#problem-container { font-size: 20px !important; }` (usually)
- Any combination of selectors

## The Three Override Systems

### 1. Display Manager (js/display-manager.js)

**Applies Inline Styles To**:

- `#problem-container` - Line 110
- `#solution-container` - Line 98
- `.falling-symbol` - Line 152 (via injected `<style>` with `!important`)

**Current Mobile Multipliers**:

```javascript
// Line 98: Solution container = 45% of base font
solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.45)`;
solutionContainer.style.lineHeight = '1.2';

// Line 110: Problem container = 40% of base font
problemContainer.style.fontSize = `calc(${config.fontSize} * 0.40)`;
problemContainer.style.letterSpacing = '1px';

// Line 152: Falling symbols = 180% of base font (1.8x multiplier)
style.textContent = `
    .falling-symbol {
        font-size: calc(${config.fontSize} * 1.8) !important;
    }
`;
```

**Trigger Events**:

- Page load
- Window resize (300ms debounce)
- Orientation change (mobile rotation)
- Display resolution change events

### 2. Lock Responsive Manager (js/lock-responsive.js)

**Applies Inline Styles To**:

- `#lock-display` - Lines 134-141
- `.lock-container` - Lines 146-151
- `.lock-body` - Lines 154-158

**What It Overrides**:

```javascript
// Line 134-141: Lock display container
lockDisplay.style.setProperty('--lock-scale', scale);
lockDisplay.style.maxWidth = `${scaledWidth}px`;
lockDisplay.style.maxHeight = `${scaledHeight}px`;
lockDisplay.style.marginTop = ''; // Removes CSS margin

// Line 146-151: Lock containers
container.style.transform = `scale(${containerScale})`;
container.style.transformOrigin = 'center center';
container.style.marginTop = ''; // Removes CSS margin

// Line 154-158: Lock bodies
body.style.transform = `scale(${bodyScale})`;
body.style.transformOrigin = 'center center';
```

**Trigger Events**:

- Page load
- Window resize (300ms debounce)
- Orientation change
- Fullscreen change

### 3. Dynamic Style Injection (display-manager.js)

**Creates Dynamic `<style>` Tag**:

```javascript
// Lines 138-157
const style = document.createElement('style');
style.id = 'dynamic-symbol-style';
style.textContent = `
    .falling-symbol {
        font-size: calc(${config.fontSize} * ${symbolMultiplier}) !important;
    }
`;
document.head.appendChild(style);
```

This injects a `<style>` tag with `!important` rules, which override normal CSS but can still be overridden by inline styles.

## How to Make Changes That Actually Work

### ❌ WRONG APPROACH (CSS Only)

```css
/* css/game.css - These changes will be IGNORED */
.res-mobile #problem-container {
    font-size: 12px; /* Overridden by JS line 110 */
}

.res-mobile #solution-container {
    font-size: 14px; /* Overridden by JS line 98 */
}

#lock-display {
    transform: scale(1.5); /* Overridden by JS line 134 */
}
```

### ✅ CORRECT APPROACH (Edit JavaScript)

**To Change Mobile Font Sizes**:

1. Open `js/display-manager.js`
2. Locate the `applyFontSizes()` method (around line 89)
3. Modify the multiplier values:

```javascript
// CURRENT VALUES (Lines 95-118)
if (isMobile) {
    solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.45)`; // 45%
    problemContainer.style.fontSize = `calc(${config.fontSize} * 0.40)`; // 40%
}

// EXAMPLE: Increase font sizes
if (isMobile) {
    solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.6)`; // 60%
    problemContainer.style.fontSize = `calc(${config.fontSize} * 0.55)`; // 55%
}
```

**To Change Lock Scaling**:

1. Open `js/lock-responsive.js`
2. Modify the `resolutionBreakpoints` object (line 13-18):

```javascript
this.resolutionBreakpoints = {
    'mobile': { width: 768, height: 1024, scale: 0.5 } // Change scale here
};
```

**To Change Symbol Rain Font Size**:

1. Open `js/display-manager.js`
2. Modify the `symbolMultiplier` in `applySymbolRainAdjustments()` (line 149):

```javascript
const symbolMultiplier = isMobile ? 1.8 : 1.2; // Change 1.8 for mobile, 1.2 for desktop
```

## Safe CSS Properties (NOT Overridden)

These CSS properties are safe to change because JavaScript doesn't touch them:

**Safe for Panel A & B**:

- `position`, `top`, `left`, `right`, `bottom`
- `margin` (except where explicitly cleared by `element.style.marginTop = ''`)
- `padding`
- `color`, `background`, `border`
- `animation`, `transition`
- `display`, `flex-direction`, `justify-content`, `align-items`
- `z-index`, `opacity`, `visibility`
- `white-space`, `overflow`

**Example - These CSS Changes WILL Work**:

```css
.res-mobile #problem-container {
    top: 80px; /* ✅ WORKS */
    color: #ff0000; /* ✅ WORKS */
    padding: 10px; /* ✅ WORKS */
}

.res-mobile #solution-container {
    margin-bottom: 70px; /* ✅ WORKS */
    padding: 5px; /* ✅ WORKS */
    max-height: calc(100vh - 120px); /* ✅ WORKS */
}
```

## Override Conflicts Reference Table

| Panel | Element | CSS Property | Overridden By | Line # | Solution |
|-------|---------|--------------|---------------|--------|----------|
| A | `#problem-container` | `font-size`, `letter-spacing` | display-manager.js | 110, 112 | Edit multiplier in JS |
| A | `#lock-display` | `transform`, `max-width`, `max-height` | lock-responsive.js | 134-141 | Edit scale in JS |
| A | `.lock-container` | `transform`, `transform-origin`, `margin-top` | lock-responsive.js | 146-151 | Edit scale in JS |
| A | `.lock-body` | `transform`, `transform-origin` | lock-responsive.js | 154-158 | Edit bodyScale in JS |
| B | `#solution-container` | `font-size`, `line-height` | display-manager.js | 98-99 | Edit multiplier in JS |
| B | `.worm-container` | None | - | - | Edit CSS freely ✅ |
| B | `#symbol-console` | None | - | - | Edit CSS freely ✅ |
| C | `.falling-symbol` | `font-size` | display-manager.js | 152 (!important) | Edit symbolMultiplier in JS |

## Detection & Debug Workflow

### Step 1: Check if Property is Overridden

1. Open browser DevTools (F12)
2. Inspect the element (right-click → Inspect)
3. Look at the "Styles" panel
4. Check if the property appears in `element.style` section
5. If YES → JavaScript is overriding it

### Step 2: Find the Override Source

**Search Pattern**:

```javascript
// In VS Code, search for:
element.style.fontSize
element.style.transform
element.style.maxWidth
```

**Console Logging**:
Look for emoji-prefixed logs:

- `🖥️` = Display Manager activity
- `🔧` = Lock Responsive Manager activity
- `📱` = Mobile-specific logging

### Step 3: Verify After Changes

1. Edit JavaScript file
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Open Console and verify emoji logs show new values
4. Inspect element and check `element.style` has correct values

## Resolution Detection Flow

```
Page Load / Resize / Orientation Change
    ↓
DisplayManager.detectAndApply()
    ↓
├─ Detects viewport width/height
├─ Determines resolution (4k/1440p/1080p/720p/mobile)
├─ Applies body class: .res-{resolution}
├─ Sets CSS variables: --display-scale, --display-font-size, etc.
├─ Applies inline styles to #problem-container
├─ Applies inline styles to #solution-container
└─ Injects <style> tag for .falling-symbol
    ↓
LockResponsiveManager.detectAndScale()
    ↓
├─ Calculates optimal lock scale
├─ Applies inline styles to #lock-display
├─ Applies inline styles to .lock-container
├─ Applies inline styles to .lock-body
└─ Adds body class: .res-{resolution}
    ↓
CSS rules evaluated LAST (but overridden by inline styles)
```

## Current Mobile Configuration (October 6, 2025)

**Base Font Size**: `14px` (from resolutions.mobile.fontSize)

**Calculated Mobile Font Sizes**:

- Problem container: `calc(14px * 0.40)` = **5.6px**
- Solution container: `calc(14px * 0.45)` = **6.3px**
- Falling symbols: `calc(14px * 1.8)` = **25.2px**

**Lock Scaling**:

- Mobile base scale: `0.5`
- Container scale: `0.5 * 0.9` = **0.45**
- Body scale: `0.5 * 0.8` = **0.40**

## Recommendations

1. **For Font Size Changes**: Always edit `js/display-manager.js`, never just CSS
2. **For Testing**: Use hard refresh (`Ctrl+Shift+R`) to clear cached JavaScript
3. **For Debugging**: Check browser console for `🖥️` and `🔧` emoji logs
4. **For New Developers**: Read this document BEFORE attempting mobile styling changes
5. **For Future**: Consider refactoring to use CSS variables instead of inline styles

## Related Documentation

- `.github/copilot-instructions.md` - Full AI agent instructions (includes override warnings)
- `js/display-manager.js` - Primary font override system
- `js/lock-responsive.js` - Lock scaling override system

---

**Status**: ✅ Investigation complete - Override behavior documented  
**Next Actions**: Commit this documentation and update copilot instructions
