# Pragmatic Worm System Refactoring Plan

## Executive Summary

**Current State:** `worm.js` contains **2,219 lines** in a single class handling 20+ responsibilities.

**Reality Check:** The original refactoring document proposed overly complex patterns (State Machine, Builder) that would add more complexity than they remove. This document provides a **practical, incremental approach** that delivers immediate value with minimal risk.

**Goal:** Reduce file to ~1,200 lines over 3 phases while maintaining full functionality and event-driven architecture.

---

## Current Code Assessment (October 2025)

### ✅ Already Implemented (Good Work!)

- Constants extraction (`POWER_UP_DROP_RATE`, `SPEED_*`, timing constants)
- `createWormElement()` factory method
- DOM query caching with time-based invalidation
- Spawn queue batching system
- `normalizeSymbol()` utility function
- `generateUniqueId()` helper
- `calculateDistance()` math helper

### ❌ Major Issues

1. **Power-up logic scattered** across 700+ lines (30% of file)
2. **4 spawn methods** with 90% duplicated setup code (300 lines)
3. **Clone methods** still exist but cloning curse was removed (dead code?)
4. **`animate()` method** is 260 lines with 6-level nesting
5. **No separation** between worm movement, power-ups, and visual effects

### 📊 Method Breakdown

| Method | Lines | Complexity | Priority |
|--------|-------|------------|----------|
| `animate()` | 260 | 🔴 High | P1 |
| Power-up methods | 700+ | 🔴 High | P1 |
| Spawn methods × 4 | 400 | 🟡 Medium | P2 |
| Clone methods × 2 | 200 | 🟢 Low | P3 (Remove?) |
| Visual effects | 150 | 🟢 Low | P3 |

---

## Phase 1: Extract Power-Up System (Week 1)

**Impact:** Remove 700+ lines → New file `js/worm-powerups.js`  
**Risk:** Low (self-contained logic)  
**Effort:** 4-6 hours

### Create Standalone Power-Up Module

```javascript
// NEW FILE: js/worm-powerups.js

class WormPowerUpSystem {
    constructor(wormSystem) {
        this.wormSystem = wormSystem;
        this.inventory = {
            chainLightning: 0,
            spider: 0,
            devil: 0
        };
        this.chainLightningKillCount = 5;
        this.displayElement = null;
        
        // Constants
        this.DROP_RATE = 0.10;
        this.TYPES = ['chainLightning', 'spider', 'devil'];
        this.EMOJIS = { chainLightning: '⚡', spider: '🕷️', devil: '👹' };
        this.SLIME_SPLAT_DURATION = 10000;
        this.SPIDER_HEART_DURATION = 60000;
        this.SKULL_DISPLAY_DURATION = 10000;
        this.DEVIL_PROXIMITY_DISTANCE = 50;
        this.DEVIL_KILL_TIME = 5000;
    }
    
    // Roll for power-up drop
    shouldDrop() {
        return Math.random() < this.DROP_RATE;
    }
    
    // Drop power-up at location
    drop(x, y, type = null) {
        if (!type) {
            type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
        }
        
        const powerUp = this.createPowerUpElement(x, y, type);
        this.wormSystem.crossPanelContainer.appendChild(powerUp);
        
        console.log(`✨ Power-up "${type}" dropped at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        
        setTimeout(() => {
            if (powerUp.parentNode) {
                powerUp.parentNode.removeChild(powerUp);
                console.log(`⏱️ Power-up "${type}" expired after ${this.SLIME_SPLAT_DURATION/1000}s`);
            }
        }, this.SLIME_SPLAT_DURATION);
    }
    
    createPowerUpElement(x, y, type) {
        const powerUp = document.createElement('div');
        powerUp.className = 'power-up';
        powerUp.dataset.type = type;
        powerUp.textContent = this.EMOJIS[type] || '⭐';
        
        Object.assign(powerUp.style, {
            left: `${x}px`,
            top: `${y}px`,
            position: 'fixed',
            fontSize: '30px',
            zIndex: '10001',
            cursor: 'pointer',
            animation: 'power-up-appear 0.5s ease-out',
            pointerEvents: 'auto'
        });
        
        powerUp.addEventListener('click', (e) => {
            e.stopPropagation();
            this.collect(type, powerUp);
        });
        
        return powerUp;
    }
    
    collect(type, element) {
        this.inventory[type]++;
        console.log(`🎁 Collected ${type}! Total: ${this.inventory[type]}`);
        
        if (type === 'chainLightning' && this.inventory[type] > 1) {
            this.chainLightningKillCount += 2;
        }
        
        element.style.animation = 'power-up-collect 0.3s ease-out';
        this.updateDisplay();
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }
    
    use(type) {
        if (this.inventory[type] <= 0) {
            console.log(`⚠️ No ${type} power-ups available!`);
            return;
        }
        
        console.log(`🎮 Using ${type} power-up!`);
        this.inventory[type]--;
        
        // Delegate to activation method
        this[`activate${this.capitalize(type)}`]();
        
        this.updateDisplay();
    }
    
    // CHAIN LIGHTNING: Click worm to kill nearby worms
    activateChainLightning() {
        console.log(`⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash!`);
        
        const killCount = this.chainLightningKillCount;
        console.log(`⚡ Will kill ${killCount} worms in proximity`);
        
        const handleWormClick = (e, worm) => {
            e.stopPropagation();
            console.log(`⚡ Chain Lightning targeting worm ${worm.id}!`);
            
            // Find closest worms
            const sortedWorms = this.wormSystem.worms
                .filter(w => w.active)
                .sort((a, b) => {
                    const distA = Math.sqrt(Math.pow(a.x - worm.x, 2) + Math.pow(a.y - worm.y, 2));
                    const distB = Math.sqrt(Math.pow(b.x - worm.x, 2) + Math.pow(b.y - worm.y, 2));
                    return distA - distB;
                })
                .slice(0, killCount);
            
            console.log(`⚡ Killing ${sortedWorms.length} worms!`);
            
            // Kill with delay for visual effect
            sortedWorms.forEach((targetWorm, index) => {
                setTimeout(() => {
                    if (targetWorm.active) {
                        // Lightning visual effect
                        this.createLightningBolt(worm.x, worm.y, targetWorm.x, targetWorm.y);
                        this.wormSystem.createExplosionFlash('#00ffff');
                        this.wormSystem.explodeWorm(targetWorm, false, true);
                    }
                }, index * 100);
            });
            
            // Reset count
            this.chainLightningKillCount = 5;
            
            // Cleanup listeners
            this.wormSystem.worms.forEach(w => {
                if (w.element && w.tempLightningHandler) {
                    w.element.removeEventListener('click', w.tempLightningHandler);
                    delete w.tempLightningHandler;
                }
            });
            
            document.body.style.cursor = '';
        };
        
        // Add temp listeners
        this.wormSystem.worms.forEach(w => {
            if (w.active && w.element) {
                w.tempLightningHandler = (e) => handleWormClick(e, w);
                w.element.addEventListener('click', w.tempLightningHandler);
            }
        });
        
        document.body.style.cursor = 'crosshair';
    }
    
    createLightningBolt(x1, y1, x2, y2) {
        const lightning = document.createElement('div');
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        lightning.style.cssText = `
            position: fixed;
            left: ${x1}px;
            top: ${y1}px;
            width: ${length}px;
            height: 3px;
            background: linear-gradient(90deg, cyan, white, cyan);
            transform-origin: 0 0;
            transform: rotate(${angle}rad);
            z-index: 10002;
            box-shadow: 0 0 10px cyan, 0 0 20px cyan;
            animation: lightning-fade 0.3s ease-out;
        `;
        
        document.body.appendChild(lightning);
        
        setTimeout(() => {
            if (lightning.parentNode) {
                lightning.parentNode.removeChild(lightning);
            }
        }, 300);
    }
    
    // SPIDER: Spawns conversion spider
    activateSpider() {
        console.log(`🕷️ SPIDER ACTIVATED! Spawning conversion spider...`);
        
        const activeWorms = this.wormSystem.worms.filter(w => w.active);
        if (activeWorms.length === 0) {
            console.log(`⚠️ No worms to convert!`);
            return;
        }
        
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        
        this.spawnSpider(startX, startY);
    }
    
    spawnSpider(x, y) {
        const spider = document.createElement('div');
        spider.className = 'spider-entity';
        spider.textContent = '🕷️';
        spider.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 40px;
            z-index: 10001;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        const spiderData = {
            id: `spider-${Date.now()}`,
            element: spider,
            x: x,
            y: y,
            type: 'spider',
            active: true,
            isHeart: false
        };
        
        // Click to turn into heart
        spider.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!spiderData.isHeart) {
                spider.textContent = '❤️';
                spiderData.isHeart = true;
                console.log(`🕷️ Spider → ❤️`);
                
                setTimeout(() => {
                    spider.textContent = '💀';
                    console.log(`❤️ → 💀`);
                    setTimeout(() => {
                        if (spider.parentNode) {
                            spider.parentNode.removeChild(spider);
                        }
                        spiderData.active = false;
                    }, this.SKULL_DISPLAY_DURATION);
                }, this.SPIDER_HEART_DURATION);
            }
        });
        
        this.wormSystem.crossPanelContainer.appendChild(spider);
        
        // Move spider AI
        const moveSpider = () => {
            if (!spiderData.active || spiderData.isHeart) return;
            
            const activeWorms = this.wormSystem.worms.filter(w => w.active);
            if (activeWorms.length === 0) return;
            
            // Find closest worm
            const closest = activeWorms.reduce((prev, curr) => {
                const prevDist = Math.sqrt(Math.pow(prev.x - spiderData.x, 2) + Math.pow(prev.y - spiderData.y, 2));
                const currDist = Math.sqrt(Math.pow(curr.x - spiderData.x, 2) + Math.pow(curr.y - spiderData.y, 2));
                return currDist < prevDist ? curr : prev;
            });
            
            const dist = Math.sqrt(Math.pow(closest.x - spiderData.x, 2) + Math.pow(closest.y - spiderData.y, 2));
            
            if (dist < 30) {
                // Convert worm → spider
                console.log(`🕷️ Converted worm ${closest.id}!`);
                this.wormSystem.removeWorm(closest);
                this.spawnSpider(closest.x, closest.y);
                
                if (spider.parentNode) {
                    spider.parentNode.removeChild(spider);
                }
                spiderData.active = false;
            } else {
                // Chase worm
                const speed = 5;
                const dx = closest.x - spiderData.x;
                const dy = closest.y - spiderData.y;
                spiderData.x += (dx / dist) * speed;
                spiderData.y += (dy / dist) * speed;
                spider.style.left = `${spiderData.x}px`;
                spider.style.top = `${spiderData.y}px`;
                
                requestAnimationFrame(moveSpider);
            }
        };
        
        moveSpider();
    }
    
    // DEVIL: Click to spawn devil magnet
    activateDevil() {
        console.log(`👹 DEVIL ACTIVATED! Click to spawn...`);
        
        const handleClick = (e) => {
            this.spawnDevil(e.clientX, e.clientY);
            document.removeEventListener('click', handleClick);
            document.body.style.cursor = '';
        };
        
        document.addEventListener('click', handleClick);
        document.body.style.cursor = 'crosshair';
    }
    
    spawnDevil(x, y) {
        const devil = document.createElement('div');
        devil.textContent = '👹';
        devil.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 60px;
            z-index: 10001;
            pointer-events: none;
            text-shadow: 0 0 20px red;
        `;
        
        this.wormSystem.crossPanelContainer.appendChild(devil);
        
        const devilData = {
            x: x,
            y: y,
            wormProximity: new Map()
        };
        
        const checkProximity = () => {
            const activeWorms = this.wormSystem.worms.filter(w => w.active);
            
            activeWorms.forEach(worm => {
                const dist = Math.sqrt(Math.pow(worm.x - devilData.x, 2) + Math.pow(worm.y - devilData.y, 2));
                
                if (dist < this.DEVIL_PROXIMITY_DISTANCE) {
                    if (!devilData.wormProximity.has(worm.id)) {
                        devilData.wormProximity.set(worm.id, Date.now());
                    } else {
                        const timeNear = Date.now() - devilData.wormProximity.get(worm.id);
                        if (timeNear >= this.DEVIL_KILL_TIME) {
                            console.log(`👹 Devil killed worm ${worm.id} after ${this.DEVIL_KILL_TIME/1000}s proximity!`);
                            this.wormSystem.explodeWorm(worm, false, false);
                            devilData.wormProximity.delete(worm.id);
                        }
                    }
                    
                    // Override worm behavior
                    worm.isRushingToDevil = true;
                    worm.devilX = devilData.x;
                    worm.devilY = devilData.y;
                } else {
                    if (devilData.wormProximity.has(worm.id)) {
                        devilData.wormProximity.delete(worm.id);
                    }
                    worm.isRushingToDevil = false;
                }
            });
            
            if (activeWorms.length > 0) {
                requestAnimationFrame(checkProximity);
            } else {
                if (devil.parentNode) {
                    devil.parentNode.removeChild(devil);
                }
            }
        };
        
        checkProximity();
    }
    
    // UI Display
    updateDisplay() {
        console.log(`📊 Power-ups: ⚡${this.inventory.chainLightning} 🕷️${this.inventory.spider} 👹${this.inventory.devil}`);
        
        if (!this.displayElement) {
            this.displayElement = this.createDisplayElement();
        }
        
        this.displayElement.innerHTML = `
            <div class="power-up-item" data-type="chainLightning" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s; position: relative;">
                ⚡ ${this.inventory.chainLightning}
                ${this.inventory.chainLightning > 0 ? `<div style="position: absolute; top: -10px; right: -10px; font-size: 12px; color: #0ff;">${this.chainLightningKillCount}</div>` : ''}
            </div>
            <div class="power-up-item" data-type="spider" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                🕷️ ${this.inventory.spider}
            </div>
            <div class="power-up-item" data-type="devil" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                👹 ${this.inventory.devil}
            </div>
        `;
        
        // Re-add click handlers
        this.displayElement.querySelectorAll('.power-up-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.style.background = 'rgba(0, 255, 0, 0.3)');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
            item.addEventListener('click', () => this.use(item.dataset.type));
        });
    }
    
    createDisplayElement() {
        const display = document.createElement('div');
        display.id = 'power-up-display';
        display.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 10px;
            font-family: 'Orbitron', monospace;
            font-size: 18px;
            z-index: 10002;
            display: flex;
            gap: 15px;
            border: 2px solid #0f0;
        `;
        
        document.body.appendChild(display);
        return display;
    }
    
    // Utility
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use in worm.js
window.WormPowerUpSystem = WormPowerUpSystem;
```

### Update `worm.js`

Replace all power-up methods with:

```javascript
class WormSystem {
    constructor() {
        // ... existing code ...
        
        // REPLACE power-up properties with manager
        this.powerUpSystem = new WormPowerUpSystem(this);
    }
    
    explodeWorm(worm, isRainKill = false, isChainReaction = false) {
        // ... existing explosion logic ...
        
        // REPLACE power-up drop logic
        if (worm.hasPowerUp && !isChainReaction) {
            this.powerUpSystem.drop(worm.x, worm.y, worm.powerUpType);
        }
        
        // ... rest of method ...
    }
    
    // DELETE: All power-up methods (700+ lines removed)
    // - dropPowerUp()
    // - collectPowerUp()
    // - updatePowerUpDisplay()
    // - usePowerUp()
    // - activateChainLightning()
    // - activateSpider()
    // - spawnSpider()
    // - activateDevil()
    // - spawnDevil()
}
```

### Update `game.html`

Add script tag BEFORE `worm.js`:

```html
<script src="js/worm-powerups.js"></script>
<script src="js/worm.js"></script>
```

**Result:** `worm.js` reduced from 2,219 → ~1,500 lines (-32%)

---

## Phase 2: Consolidate Spawn Methods (Week 2)

**Impact:** Remove 300+ lines of duplication  
**Risk:** Medium (requires careful testing)  
**Effort:** 3-4 hours

### Problem: 4 Spawn Methods with 90% Overlap

```javascript
spawnWormFromConsole()    // 120 lines
spawnWorm()               // 100 lines (fallback)
spawnWormFromBorder()     // 130 lines
spawnPurpleWorm()         // 120 lines
```

### Solution: Single Factory Method with Config Object

```javascript
class WormSystem {
    /**
     * Universal worm spawner - handles all spawn types
     * @param {Object} config - Spawn configuration
     */
    spawnWorm(config = {}) {
        this.initialize();
        
        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached`);
            return null;
        }
        
        // Defaults
        const defaults = {
            type: 'normal',        // 'normal', 'console', 'border', 'purple'
            x: null,               // Auto-calculate if null
            y: null,
            isPurple: false,
            canStealBlue: false,
            fromConsole: false,
            consoleSlotIndex: null,
            consoleSlotElement: null,
            speed: this.SPEED_FALLBACK_WORM,
            roamDuration: 5000,
            classNames: []
        };
        
        const cfg = { ...defaults, ...config };
        
        // Calculate position if not provided
        if (cfg.x === null || cfg.y === null) {
            const pos = this.calculateSpawnPosition(cfg.type, cfg);
            cfg.x = pos.x;
            cfg.y = pos.y;
        }
        
        // Lock console slot if spawning from console
        if (cfg.fromConsole && cfg.consoleSlotElement) {
            this.lockedConsoleSlots.add(cfg.consoleSlotIndex);
            cfg.consoleSlotElement.classList.add('worm-spawning', 'locked');
            console.log(`🕳️ Worm spawning from console slot ${cfg.consoleSlotIndex + 1}`);
        }
        
        // Create worm element
        const wormId = generateUniqueId(cfg.type === 'purple' ? 'purple-worm' : 'worm');
        const wormElement = this.createWormElement({
            id: wormId,
            classNames: cfg.classNames,
            x: cfg.x,
            y: cfg.y
        });
        
        this.crossPanelContainer.appendChild(wormElement);
        
        // Power-up roll
        const hasPowerUp = this.powerUpSystem.shouldDrop();
        const powerUpType = hasPowerUp ? 
            this.powerUpSystem.TYPES[Math.floor(Math.random() * this.powerUpSystem.TYPES.length)] : 
            null;
        
        // Create worm data
        const wormData = {
            id: wormId,
            element: wormElement,
            x: cfg.x,
            y: cfg.y,
            velocityX: (Math.random() - 0.5) * cfg.speed,
            velocityY: (Math.random() - 0.5) * (cfg.speed / 2),
            active: true,
            hasStolen: false,
            isRushingToTarget: cfg.isPurple,
            roamingEndTime: Date.now() + cfg.roamDuration,
            baseSpeed: cfg.speed,
            currentSpeed: cfg.speed,
            crawlPhase: Math.random() * Math.PI * 2,
            direction: Math.random() * Math.PI * 2,
            
            // Type-specific
            isPurple: cfg.isPurple,
            canStealBlue: cfg.canStealBlue,
            fromConsole: cfg.fromConsole,
            consoleSlotIndex: cfg.consoleSlotIndex,
            consoleSlotElement: cfg.consoleSlotElement,
            shouldExitToConsole: cfg.type === 'border',
            
            // Power-up
            hasPowerUp: hasPowerUp,
            powerUpType: powerUpType,
            
            // State
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: null,
            isFlickering: false
        };
        
        if (hasPowerUp) {
            console.log(`✨ Worm ${wormId} has power-up: ${powerUpType}`);
        }
        
        this.worms.push(wormData);
        
        // Add click handler
        const clickHandler = cfg.isPurple ? 
            (e) => { e.stopPropagation(); this.handlePurpleWormClick(wormData); } :
            (e) => { e.stopPropagation(); this.handleWormClick(wormData); };
        
        wormElement.addEventListener('click', clickHandler);
        
        console.log(`✅ Worm ${wormId} spawned at (${cfg.x.toFixed(0)}, ${cfg.y.toFixed(0)}). Total: ${this.worms.length}`);
        
        // Start animation if first worm
        if (this.worms.length === 1) {
            this.animate();
        }
        
        return wormData;
    }
    
    calculateSpawnPosition(type, config) {
        switch(type) {
            case 'console':
                const slotRect = config.consoleSlotElement.getBoundingClientRect();
                return {
                    x: slotRect.left + (slotRect.width / 2),
                    y: slotRect.top + (slotRect.height / 2)
                };
            
            case 'border':
                const position = config.borderIndex / config.borderTotal;
                const margin = this.BORDER_MARGIN;
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                
                if (position < 0.5) {
                    // Bottom edge
                    return {
                        x: margin + (position * 2) * (vw - 2 * margin),
                        y: vh - margin
                    };
                } else if (position < 0.75) {
                    // Left edge
                    const yPos = (position - 0.5) * 4;
                    return {
                        x: margin,
                        y: margin + yPos * (vh - 2 * margin)
                    };
                } else {
                    // Right edge
                    const yPos = (position - 0.75) * 4;
                    return {
                        x: vw - margin,
                        y: margin + yPos * (vh - 2 * margin)
                    };
                }
            
            case 'purple':
                const helpButton = this.cachedHelpButton || document.getElementById('help-button');
                if (helpButton) {
                    const rect = helpButton.getBoundingClientRect();
                    return {
                        x: rect.left + (rect.width / 2),
                        y: rect.top + (rect.height / 2)
                    };
                }
                return {
                    x: Math.random() * window.innerWidth,
                    y: -50
                };
            
            default: // 'normal'
                return {
                    x: Math.random() * Math.max(0, window.innerWidth - 80),
                    y: Math.max(0, window.innerHeight - 30)
                };
        }
    }
    
    // Convenience wrappers for existing code
    spawnWormFromConsole() {
        const slotData = this.findEmptyConsoleSlot();
        if (!slotData) {
            console.log('⚠️ All console slots occupied, spawning normally');
            return this.spawnWorm({ type: 'normal' });
        }
        
        return this.spawnWorm({
            type: 'console',
            fromConsole: true,
            consoleSlotIndex: slotData.index,
            consoleSlotElement: slotData.element,
            speed: this.SPEED_CONSOLE_WORM,
            roamDuration: this.difficultyRoamTimeConsole,
            classNames: ['console-worm']
        });
    }
    
    spawnWormFromBorder(data = {}) {
        return this.spawnWorm({
            type: 'border',
            borderIndex: data.index || 0,
            borderTotal: data.total || 1,
            speed: this.SPEED_BORDER_WORM,
            roamDuration: this.difficultyRoamTimeBorder
        });
    }
    
    spawnPurpleWorm() {
        return this.spawnWorm({
            type: 'purple',
            isPurple: true,
            canStealBlue: true,
            speed: this.SPEED_PURPLE_WORM,
            classNames: ['purple-worm']
        });
    }
}
```

**Result:** `worm.js` reduced from 1,500 → ~1,200 lines (-20%)

---

## Phase 3: Break Up `animate()` Method (Week 3)

**Impact:** Reduce 260-line method to 30 lines  
**Risk:** Low (extract method refactoring)  
**Effort:** 2-3 hours

### Current Problem

`animate()` has 6-level nesting and handles:

- Devil behavior override
- Roaming timeout check
- Rushing behavior
- Roaming behavior
- Console return behavior
- Carrying behavior

### Solution: Extract Behavior Methods

```javascript
class WormSystem {
    animate() {
        if (this.worms.length === 0) {
            this.animationFrameId = null;
            return;
        }
        
        this.worms.forEach(worm => {
            if (!worm.active) return;
            
            // Update crawl animation
            worm.crawlPhase = (worm.crawlPhase + 0.05) % (Math.PI * 2);
            
            // Update behavior based on state
            this.updateWormBehavior(worm);
            
            // Apply position to DOM
            worm.element.style.left = `${worm.x}px`;
            worm.element.style.top = `${worm.y}px`;
        });
        
        // Continue loop
        if (this.worms.some(w => w.active)) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationFrameId = null;
        }
    }
    
    updateWormBehavior(worm) {
        const currentTime = Date.now();
        
        // Priority 1: Devil override
        if (worm.isRushingToDevil) {
            this.updateDevilBehavior(worm);
            return;
        }
        
        // Priority 2: Roaming timeout → steal
        if (!worm.hasStolen && !worm.isRushingToTarget && currentTime >= worm.roamingEndTime) {
            this.stealSymbol(worm);
            return;
        }
        
        // Priority 3: State-based behavior
        if (worm.isRushingToTarget && !worm.hasStolen) {
            this.updateRushingBehavior(worm);
        } else if (!worm.hasStolen && !worm.isRushingToTarget) {
            this.updateRoamingBehavior(worm);
        } else if (worm.hasStolen && worm.fromConsole) {
            this.updateConsoleReturnBehavior(worm);
        } else if (worm.hasStolen) {
            this.updateCarryingBehavior(worm);
        }
    }
    
    updateDevilBehavior(worm) {
        const distance = Math.sqrt(
            Math.pow(worm.devilX - worm.x, 2) + 
            Math.pow(worm.devilY - worm.y, 2)
        );
        
        if (distance <= 5) return; // Already at devil
        
        const dx = worm.devilX - worm.x;
        const dy = worm.devilY - worm.y;
        const rushSpeed = worm.baseSpeed * 2;
        
        worm.velocityX = (dx / distance) * rushSpeed;
        worm.velocityY = (dy / distance) * rushSpeed;
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
        
        worm.element.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI}rad)`;
    }
    
    updateRushingBehavior(worm) {
        const revealedSymbols = this.getCachedRevealedSymbols();
        const availableSymbols = Array.from(revealedSymbols).filter(el => 
            !el.dataset.stolen && el.style.visibility !== 'hidden'
        );
        
        let targetSymbols;
        
        if (worm.isPurple) {
            // Purple worms: prioritize red, fallback to blue
            const redSymbols = availableSymbols.filter(el => 
                el.classList.contains('hidden-symbol') && !el.classList.contains('revealed-symbol')
            );
            
            if (redSymbols.length > 0) {
                targetSymbols = redSymbols;
            } else if (worm.canStealBlue) {
                targetSymbols = availableSymbols.filter(el => 
                    el.classList.contains('revealed-symbol')
                );
            } else {
                worm.isRushingToTarget = false;
                worm.roamingEndTime = Date.now() + 5000;
                return;
            }
        } else {
            // Normal worms: red symbols only
            targetSymbols = availableSymbols.filter(el => 
                el.classList.contains('hidden-symbol') && !el.classList.contains('revealed-symbol')
            );
        }
        
        if (targetSymbols.length === 0 || !this.isWormInPanelB(worm)) {
            worm.isRushingToTarget = false;
            worm.roamingEndTime = Date.now() + 5000;
            return;
        }
        
        // Find target
        let target;
        if (worm.targetSymbol) {
            const normalizedTarget = normalizeSymbol(worm.targetSymbol);
            target = targetSymbols.find(el => normalizeSymbol(el.textContent) === normalizedTarget);
        }
        
        if (!target) {
            target = targetSymbols[Math.floor(Math.random() * targetSymbols.length)];
        }
        
        // Move toward target
        const targetRect = target.getBoundingClientRect();
        const targetX = targetRect.left + (targetRect.width / 2);
        const targetY = targetRect.top + (targetRect.height / 2);
        
        const dx = targetX - worm.x;
        const dy = targetY - worm.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 20) {
            this.stealSymbol(worm, target);
            return;
        }
        
        const rushSpeed = worm.baseSpeed * 1.5;
        worm.velocityX = (dx / distance) * rushSpeed;
        worm.velocityY = (dy / distance) * rushSpeed;
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
        
        worm.element.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI}rad)`;
    }
    
    updateRoamingBehavior(worm) {
        // Smooth direction changes
        worm.direction += (Math.random() - 0.5) * 0.1;
        
        // Crawling with inchworm effect
        const crawlOffset = Math.sin(worm.crawlPhase) * 0.5;
        worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
        worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);
        
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
        
        // Bounce off edges
        this.applyViewportBoundaries(worm);
        
        // Rotate worm
        worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
    }
    
    updateConsoleReturnBehavior(worm) {
        if (!worm.consoleSlotElement) {
            this.updateRoamingBehavior(worm);
            return;
        }
        
        const slotRect = worm.consoleSlotElement.getBoundingClientRect();
        const slotX = slotRect.left + (slotRect.width / 2);
        const slotY = slotRect.top + (slotRect.height / 2);
        
        const dx = slotX - worm.x;
        const dy = slotY - worm.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 15) {
            console.log(`🏠 Worm ${worm.id} returned to console slot ${worm.consoleSlotIndex + 1}`);
            this.removeWorm(worm);
            return;
        }
        
        worm.velocityX = (dx / distance) * worm.baseSpeed;
        worm.velocityY = (dy / distance) * worm.baseSpeed;
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
        
        worm.element.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI}rad)`;
    }
    
    updateCarryingBehavior(worm) {
        // Just roam with symbol
        this.updateRoamingBehavior(worm);
    }
    
    applyViewportBoundaries(worm) {
        const margin = 20;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        if (worm.x < margin) {
            worm.x = margin;
            worm.direction = Math.PI - worm.direction;
        } else if (worm.x > vw - margin) {
            worm.x = vw - margin;
            worm.direction = Math.PI - worm.direction;
        }
        
        if (worm.y < margin) {
            worm.y = margin;
            worm.direction = -worm.direction;
        } else if (worm.y > vh - margin) {
            worm.y = vh - margin;
            worm.direction = -worm.direction;
        }
    }
    
    isWormInPanelB(worm) {
        const panelBRect = this.getCachedContainerRect();
        return (
            worm.x >= panelBRect.left &&
            worm.x <= panelBRect.right &&
            worm.y >= panelBRect.top &&
            worm.y <= panelBRect.bottom
        );
    }
}
```

**Result:** Clean, testable behavior methods with single responsibility

---

## Phase 4: Remove Dead Code (Bonus - 30 minutes)

### Clone Methods - Still Needed?

According to copilot-instructions.md: *"Cloning curse mechanic completely removed from codebase"*

But `worm.js` still has:

- `cloneWorm()` - 100 lines
- `clonePurpleWorm()` - 100 lines

**Action:** Verify these are dead code and remove if unused.

```javascript
// SEARCH FOR USAGE
grep -r "cloneWorm\|clonePurpleWorm" js/
```

If only called from within themselves (circular), **DELETE BOTH METHODS**.

---

## Summary: Before & After

| Metric | Before | After Phase 3 | Improvement |
|--------|--------|---------------|-------------|
| **Total Lines** | 2,219 | ~1,100 | **-50%** |
| **Largest Method** | 260 | 30 | **-88%** |
| **Files** | 1 | 2 | Better separation |
| **Power-Up Lines** | 700 | 0 (moved) | ✅ |
| **Spawn Methods** | 4 (400 lines) | 1 (100 lines) | **-75%** |
| **Clone Methods** | 200 | 0 (removed) | ✅ |
| **Responsibilities** | 20+ | 8 | **-60%** |

---

## Implementation Checklist

### Week 1: Power-Up Extraction

- [ ] Create `js/worm-powerups.js`
- [ ] Copy all power-up methods to new file
- [ ] Replace WormSystem power-up code with `this.powerUpSystem` calls
- [ ] Add script tag to `game.html`
- [ ] Test all 3 power-ups (chain lightning, spider, devil)
- [ ] Verify power-up display UI works
- [ ] Test power-up collection and usage
- [ ] Commit: `♻️ Extract power-up system to separate file (-700 lines)`

### Week 2: Spawn Consolidation

- [ ] Create `spawnWorm(config)` universal method
- [ ] Create `calculateSpawnPosition(type, config)` helper
- [ ] Create wrapper methods for backwards compatibility
- [ ] Test console spawning
- [ ] Test border spawning
- [ ] Test purple worm spawning
- [ ] Test fallback spawning
- [ ] Remove old spawn methods
- [ ] Commit: `♻️ Consolidate spawn methods (-300 lines)`

### Week 3: Animate Refactoring

- [ ] Create `updateWormBehavior(worm)` dispatcher
- [ ] Extract `updateDevilBehavior(worm)`
- [ ] Extract `updateRushingBehavior(worm)`
- [ ] Extract `updateRoamingBehavior(worm)`
- [ ] Extract `updateConsoleReturnBehavior(worm)`
- [ ] Extract `updateCarryingBehavior(worm)`
- [ ] Extract `applyViewportBoundaries(worm)`
- [ ] Extract `isWormInPanelB(worm)`
- [ ] Test all worm behaviors
- [ ] Commit: `♻️ Break up animate() method into behavior handlers (-230 lines)`

### Bonus: Dead Code Removal

- [ ] Search for `cloneWorm` usage
- [ ] Search for `clonePurpleWorm` usage
- [ ] If unused, delete both methods
- [ ] Test game still works
- [ ] Commit: `🗑️ Remove unused clone methods (-200 lines)`

---

## Testing Strategy

### Automated Checks (Add to CI if exists)

```javascript
// Quick sanity test
const testWormSystem = () => {
    const system = new WormSystem();
    system.initialize();
    
    // Test spawn
    const worm = system.spawnWorm({ type: 'normal' });
    console.assert(worm !== null, 'Spawn failed');
    console.assert(system.worms.length === 1, 'Worm not added');
    
    // Test power-up system exists
    console.assert(system.powerUpSystem !== undefined, 'Power-up system missing');
    console.assert(typeof system.powerUpSystem.drop === 'function', 'Power-up drop missing');
    
    console.log('✅ All tests passed');
};
```

### Manual Testing Checklist

- [ ] Load game in browser (beginner level)
- [ ] Solve first line → worms spawn
- [ ] Kill worm → power-up drops
- [ ] Collect power-up → UI updates
- [ ] Use chain lightning → kills multiple worms
- [ ] Use spider → converts worms
- [ ] Use devil → attracts worms
- [ ] Purple worm spawns after wrong answers
- [ ] Purple worm steals blue symbols
- [ ] Console slot spawning works
- [ ] Border spawning works
- [ ] Worm roaming looks natural
- [ ] Worm rushing works
- [ ] Symbol stealing works
- [ ] Worm explosion looks good
- [ ] Test on mobile (responsive)

---

## Why This Plan Is Better

| Original Doc | This Plan |
|--------------|-----------|
| State Pattern (4+ new classes) | Simple method extraction |
| Builder Pattern (complex) | Config object (native JS) |
| Object Pooling (premature) | Focus on code clarity first |
| Unit tests (DOM-coupled) | Manual integration tests |
| 6 weeks estimated | 3 weeks realistic |
| High risk of over-engineering | Pragmatic, incremental |

**Bottom Line:** This plan delivers **50% code reduction** in **3 weeks** with **low risk** and **immediate value**. No fancy patterns, just solid refactoring.

---

## Maintenance Notes

After refactoring:

1. **Adding new power-ups:** Edit `js/worm-powerups.js` only
2. **Changing spawn behavior:** Edit `spawnWorm(config)` method
3. **Adding worm behaviors:** Add new `update*Behavior(worm)` method
4. **Event-driven architecture:** Still preserved (no changes)

---

## Appendix: CSS Animation Needed

Add to `css/worm-styles.css`:

```css
@keyframes lightning-fade {
    0% { opacity: 1; }
    100% { opacity: 0; }
}

@keyframes power-up-appear {
    0% { transform: scale(0) rotate(0deg); opacity: 0; }
    50% { transform: scale(1.2) rotate(180deg); }
    100% { transform: scale(1) rotate(360deg); opacity: 1; }
}

@keyframes power-up-collect {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0) translateY(-50px); opacity: 0; }
}
```

---

**Document Version:** 1.0  
**Created:** October 12, 2025  
**Status:** Ready for Implementation  
**Estimated Completion:** November 2, 2025
