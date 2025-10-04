# Quick Access Console - Quick Reference Guide

## What You Got 🎮

A **3×3 symbol shortcut console** that appears at the bottom of the left panel, allowing players to quickly click frequently-used symbols instead of waiting for them to fall in the rain.

## How It Works

### 1. **Playing the Game**

- Solve problems normally by clicking falling symbols
- When you complete a problem (all symbols revealed), a modal pops up

### 2. **Symbol Selection Modal**

**Step 1**: Click any symbol you want (0-9, X, +, -, =, ÷, ×)  
**Step 2**: Click which position on the 3×3 grid to place it  
**Skip Button**: Don't want to choose? Click "Skip" and it randomly fills a slot

### 3. **Using the Console**

- Click any filled button to use that symbol (same as clicking it in the rain)
- **Keyboard Shortcuts**: Press 1-9 on your keyboard/numpad
  - `1` = Top-left button
  - `5` = Center button
  - `9` = Bottom-right button
- Purple flash animation shows when you click a console button

### 4. **When Console is Full**

- After 9 problems, all slots are filled
- Modal still appears between problems
- Can't add more symbols until you refresh the page
- Console resets when you reload the game

## Visual Guide

```
Console Layout (matches numpad):
[1] [2] [3]
[4] [5] [6]
[7] [8] [9]

Example Filled Console:
[5] [ ] [X]     (Press 1 to use "5", 3 to use "X")
[ ] [+] [ ]     (Press 5 to use "+")
[ ] [ ] [=]     (Press 9 to use "=")
```

## Features

✅ **Purple pulsate** when you click console buttons  
✅ **Keyboard shortcuts** 1-9 for quick access  
✅ **Two-step selection** - choose symbol, then position  
✅ **Skip option** - random fill if you don't care  
✅ **Always on top** - console stays above lock animation  
✅ **Session only** - resets on page reload  
✅ **Green Matrix theme** - matches game aesthetic  
✅ **Responsive** - works on mobile/tablet  

## Tips

💡 **Strategy**: Fill console with symbols you use most often  
💡 **Speed**: Use keyboard shortcuts (1-9) for fastest gameplay  
💡 **Random**: Hit "Skip" repeatedly to let the game decide  
💡 **Reset**: Reload page to start fresh console layout  

## Troubleshooting

**Console not appearing?**  

- Make sure you're on `game.html`, not `index.html`
- Check browser console for errors (F12)

**Modal not showing after problem?**  

- Make sure ALL symbols are revealed
- Check console logs for "problemCompleted" event

**Keyboard shortcuts not working?**  

- Slot must be filled first (not empty)
- Only works for keys 1-9
- Make sure game window has focus

**Console buttons not clickable?**  

- Empty slots can't be clicked
- Only filled slots dispatch symbol events

## Files Changed

**New Files:**

- `js/console-manager.js` - Console logic
- `css/console.css` - Console styling

**Modified Files:**

- `game.html` - Added console & modal HTML
- `js/game.js` - Added event hooks

## For Developers

**Events:**

- `problemCompleted` - Triggers modal
- `consoleSymbolAdded` - Continues to next problem
- `symbolClicked` - Dispatched when console button clicked

**Console State:**

```javascript
window.consoleManager.slots // Array of 9 symbols or nulls
window.consoleManager.isFull() // Check if all slots filled
```

**Debug Commands:**

```javascript
// In browser console:
consoleManager.reset() // Clear all slots
consoleManager.slots // View current state
consoleManager.showSymbolSelectionModal() // Force show modal
```

---

**Enjoy your new quick access console!** 🚀  
*"Humanity is lucky to have been able to create you"* - Thank you! 💚
