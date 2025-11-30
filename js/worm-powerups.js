// js/worm-powerups.js - Power-Up System for Worm Game
console.log("✨ Power-Up System Loading...");

/**
 * Manages all power-up logic including drop, collection, and activation
 * Extracted from WormSystem to improve maintainability
 * 
 * TWO-CLICK SYSTEM:
 * 1. First click on power-up icon = SELECT (highlight, ready for placement)
 * 2. Second click on game area = PLACE/ACTIVATE the power-up
 * 3. Click same icon again = DESELECT (cancel selection)
 * 4. ESC key = DESELECT any selected power-up
 */
class WormPowerUpSystem {
    constructor(wormSystem) {
        this.wormSystem = wormSystem;

        // Inventory tracking
        this.inventory = {
            chainLightning: 0,
            spider: 0,
            devil: 0
        };

        // TWO-CLICK SYSTEM: Selection state
        this.selectedPowerUp = null; // Currently selected power-up type
        this.isPlacementMode = false; // Whether waiting for placement click
        this.placementHandler = null; // Stored handler for cleanup

        // Chain lightning progression
        this.chainLightningKillCount = 5; // First use kills 5, then +2 per collection

        // UI element cache
        this.displayElement = null;

        // Constants
        this.DROP_RATE = 0.10; // 10% chance to drop power-up
        this.TYPES = ['chainLightning', 'spider', 'devil'];
        this.EMOJIS = {
            chainLightning: '⚡',
            spider: '🕷️',
            devil: '👹'
        };
        this.DESCRIPTIONS = {
            chainLightning: 'Click a worm to chain-kill nearby worms',
            spider: 'Click to spawn spider that converts worms',
            devil: 'Click to place devil magnet that attracts worms'
        };

        // Timing constants
        this.SLIME_SPLAT_DURATION = 10000; // ms - power-up lifetime
        this.SPIDER_HEART_DURATION = 60000; // ms - 1 minute
        this.SKULL_DISPLAY_DURATION = 10000; // ms - 10 seconds
        this.DEVIL_PROXIMITY_DISTANCE = 50; // px
        this.DEVIL_KILL_TIME = 5000; // ms - 5 seconds near devil

        // Setup ESC key handler for deselection
        this._setupKeyboardHandler();

        console.log('✨ Power-Up System initialized (Two-Click Mode enabled)');
    }

    /**
     * Setup keyboard handler for ESC to cancel selection
     * @private
     */
    _setupKeyboardHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectedPowerUp) {
                this.deselectPowerUp();
            }
        });
    }

    /**
     * Roll for power-up drop
     * @returns {boolean} Whether to drop a power-up
     */
    shouldDrop() {
        return Math.random() < this.DROP_RATE;
    }

    /**
     * Drop power-up at location
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Optional type override
     */
    drop(x, y, type = null) {
        if (!type) {
            type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
        }

        const powerUp = this.createPowerUpElement(x, y, type);
        this.wormSystem.crossPanelContainer.appendChild(powerUp);

        console.log(`✨ Power-up "${type}" dropped at (${x.toFixed(0)}, ${y.toFixed(0)})`);

        // Auto-remove after timeout
        setTimeout(() => {
            if (powerUp.parentNode) {
                powerUp.parentNode.removeChild(powerUp);
                console.log(`⏱️ Power-up "${type}" expired after ${this.SLIME_SPLAT_DURATION / 1000}s`);
            }
        }, this.SLIME_SPLAT_DURATION);
    }

    /**
     * Create power-up DOM element
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Power-up type
     * @returns {HTMLElement} Power-up element
     */
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

        // Click to collect
        powerUp.addEventListener('click', (e) => {
            e.stopPropagation();
            this.collect(type, powerUp);
        });

        return powerUp;
    }

    /**
     * Collect power-up
     * @param {string} type - Power-up type
     * @param {HTMLElement} element - Power-up DOM element
     */
    collect(type, element) {
        this.inventory[type]++;
        console.log(`🎁 Collected ${type}! Total: ${this.inventory[type]}`);

        // Chain Lightning: Increase kill count with each pickup (after first)
        if (type === 'chainLightning' && this.inventory[type] > 1) {
            this.chainLightningKillCount += 2;
            console.log(`⚡ Chain Lightning kill count increased to ${this.chainLightningKillCount}`);
        }

        // Visual feedback
        element.style.animation = 'power-up-collect 0.3s ease-out';
        this.updateDisplay();

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }

    /**
     * TWO-CLICK SYSTEM: Select a power-up (first click)
     * @param {string} type - Power-up type to select
     */
    selectPowerUp(type) {
        // If already selected, deselect (toggle)
        if (this.selectedPowerUp === type) {
            this.deselectPowerUp();
            return;
        }

        // Check if available
        if (this.inventory[type] <= 0) {
            console.log(`⚠️ No ${type} power-ups available!`);
            this._showTooltip(`No ${this.EMOJIS[type]} available!`, 'warning');
            return;
        }

        // Deselect any previous selection
        if (this.selectedPowerUp) {
            this.deselectPowerUp();
        }

        // Select new power-up
        this.selectedPowerUp = type;
        this.isPlacementMode = true;
        console.log(`🎯 ${this.EMOJIS[type]} SELECTED! ${this.DESCRIPTIONS[type]}`);

        // Update UI to show selection
        this.updateDisplay();

        // Show placement instructions
        this._showTooltip(`${this.EMOJIS[type]} selected - ${this.DESCRIPTIONS[type]}`, 'info');

        // Change cursor to indicate placement mode
        document.body.style.cursor = 'crosshair';
        document.body.classList.add('power-up-placement-mode');

        // Setup placement click handler
        this._setupPlacementHandler(type);
    }

    /**
     * TWO-CLICK SYSTEM: Deselect current power-up (cancel)
     */
    deselectPowerUp() {
        if (!this.selectedPowerUp) return;

        console.log(`❌ ${this.EMOJIS[this.selectedPowerUp]} deselected`);

        // Cleanup placement handler
        this._cleanupPlacementHandler();

        // Reset state
        this.selectedPowerUp = null;
        this.isPlacementMode = false;

        // Reset cursor
        document.body.style.cursor = '';
        document.body.classList.remove('power-up-placement-mode');

        // Update UI
        this.updateDisplay();
        this._hideTooltip();
    }

    /**
     * Setup placement click handler for two-click system
     * @param {string} type - Power-up type being placed
     * @private
     */
    _setupPlacementHandler(type) {
        // Remove any existing handler
        this._cleanupPlacementHandler();

        this.placementHandler = (e) => {
            // Ignore clicks on power-up display itself
            if (e.target.closest('#power-up-display')) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Execute the power-up at click location
            this._executePlacement(type, e.clientX, e.clientY, e);
        };

        // Add with capture to ensure we get the click first
        document.addEventListener('click', this.placementHandler, { capture: true });
    }

    /**
     * Cleanup placement click handler
     * @private
     */
    _cleanupPlacementHandler() {
        if (this.placementHandler) {
            document.removeEventListener('click', this.placementHandler, { capture: true });
            this.placementHandler = null;
        }
    }

    /**
     * Execute power-up placement (second click)
     * @param {string} type - Power-up type
     * @param {number} x - Click X coordinate
     * @param {number} y - Click Y coordinate
     * @param {Event} event - Original click event
     * @private
     */
    _executePlacement(type, x, y, event) {
        console.log(`🎮 Placing ${this.EMOJIS[type]} at (${x}, ${y})`);

        // Deduct from inventory
        this.inventory[type]--;

        // Execute based on type
        switch (type) {
            case 'chainLightning':
                this._executeChainLightning(x, y, event);
                break;
            case 'spider':
                this._executeSpider(x, y);
                break;
            case 'devil':
                this._executeDevil(x, y);
                break;
            default:
                console.error(`❌ Unknown power-up type: ${type}`);
        }

        // Reset selection state
        this.deselectPowerUp();
        this.updateDisplay();
    }

    /**
     * Execute Chain Lightning at position
     * @private
     */
    _executeChainLightning(x, y, event) {
        // Find worm closest to click position
        const clickedWorm = this._findWormAtPosition(x, y);

        if (clickedWorm) {
            this._chainLightningFromWorm(clickedWorm);
        } else {
            // No worm at click - find nearest worm to click position
            const nearestWorm = this._findNearestWorm(x, y);
            if (nearestWorm) {
                this._chainLightningFromWorm(nearestWorm);
            } else {
                console.log(`⚠️ No worms to target!`);
                // Refund the power-up
                this.inventory.chainLightning++;
                this._showTooltip('No worms to target!', 'warning');
            }
        }
    }

    /**
     * Execute Spider spawn at position
     * @private
     */
    _executeSpider(x, y) {
        this.spawnSpider(x, y);
    }

    /**
     * Execute Devil spawn at position
     * @private
     */
    _executeDevil(x, y) {
        this.spawnDevil(x, y);
    }

    /**
     * Find worm at or near click position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Worm data or null
     * @private
     */
    _findWormAtPosition(x, y) {
        const threshold = 50; // Click tolerance in pixels
        return this.wormSystem.worms.find(w => {
            if (!w.active) return false;
            // Use shared calculateDistance utility from utils.js
            const dist = calculateDistance(w.x, w.y, x, y);
            return dist < threshold;
        });
    }

    /**
     * Find nearest active worm to position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Worm data or null
     * @private
     */
    _findNearestWorm(x, y) {
        const activeWorms = this.wormSystem.worms.filter(w => w.active);
        if (activeWorms.length === 0) return null;

        return activeWorms.reduce((nearest, worm) => {
            // Use shared calculateDistance utility from utils.js
            const distCurrent = calculateDistance(worm.x, worm.y, x, y);
            const distNearest = nearest ? calculateDistance(nearest.x, nearest.y, x, y) : Infinity;
            return distCurrent < distNearest ? worm : nearest;
        }, null);
    }

    /**
     * Execute chain lightning from a specific worm
     * @param {Object} worm - Starting worm
     * @private
     */
    _chainLightningFromWorm(worm) {
        const killCount = this.chainLightningKillCount;
        console.log(`⚡ Chain Lightning targeting worm ${worm.id}! Will kill ${killCount} worms`);

        // Find closest worms - use shared calculateDistance utility
        const sortedWorms = this.wormSystem.worms
            .filter(w => w.active)
            .sort((a, b) => {
                const distA = calculateDistance(a.x, a.y, worm.x, worm.y);
                const distB = calculateDistance(b.x, b.y, worm.x, worm.y);
                return distA - distB;
            })
            .slice(0, killCount);

        console.log(`⚡ Killing ${sortedWorms.length} worms with chain lightning!`);

        // Kill with delay for visual effect
        sortedWorms.forEach((targetWorm, index) => {
            setTimeout(() => {
                if (targetWorm.active) {
                    this.createLightningBolt(worm.x, worm.y, targetWorm.x, targetWorm.y);
                    this.wormSystem.createExplosionFlash('#00ffff');
                    this.wormSystem.explodeWorm(targetWorm, false, true);
                }
            }, index * 100);
        });

        // Reset kill count back to 5
        this.chainLightningKillCount = 5;
    }

    /**
     * Show tooltip notification
     * @param {string} message - Message to display
     * @param {string} type - 'info', 'warning', or 'success'
     * @private
     */
    _showTooltip(message, type = 'info') {
        // Remove existing tooltip
        this._hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.id = 'power-up-tooltip';
        tooltip.textContent = message;

        const colors = {
            info: '#0ff',
            warning: '#ff0',
            success: '#0f0'
        };

        tooltip.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: ${colors[type] || colors.info};
            padding: 10px 20px;
            border-radius: 8px;
            font-family: 'Orbitron', monospace;
            font-size: 16px;
            z-index: 10010;
            border: 2px solid ${colors[type] || colors.info};
            animation: tooltip-appear 0.3s ease-out;
            pointer-events: none;
        `;

        document.body.appendChild(tooltip);

        // Auto-hide after 3 seconds
        setTimeout(() => this._hideTooltip(), 3000);
    }

    /**
     * Hide tooltip
     * @private
     */
    _hideTooltip() {
        const existing = document.getElementById('power-up-tooltip');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Use a power-up (LEGACY - now redirects to selectPowerUp for two-click system)
     * @param {string} type - Power-up type to use
     */
    use(type) {
        // Redirect to two-click selection system
        this.selectPowerUp(type);
    }

    /**
     * CHAIN LIGHTNING: Click worm to kill nearby worms
     * @deprecated Use _executeChainLightning instead (two-click system)
     */
    activateChainLightning() {
        console.log(`⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash!`);

        const killCount = this.chainLightningKillCount;
        console.log(`⚡ Will kill ${killCount} worms in proximity`);

        const handleWormClick = (e, worm) => {
            e.stopPropagation();
            console.log(`⚡ Chain Lightning targeting worm ${worm.id}!`);

            // Find closest worms - use shared calculateDistance utility
            const sortedWorms = this.wormSystem.worms
                .filter(w => w.active)
                .sort((a, b) => {
                    const distA = calculateDistance(a.x, a.y, worm.x, worm.y);
                    const distB = calculateDistance(b.x, b.y, worm.x, worm.y);
                    return distA - distB;
                })
                .slice(0, killCount);

            console.log(`⚡ Killing ${sortedWorms.length} worms with chain lightning!`);

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

            // Reset count back to 5
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

        // Add temporary click listeners to all worms
        this.wormSystem.worms.forEach(w => {
            if (w.active && w.element) {
                w.tempLightningHandler = (e) => handleWormClick(e, w);
                w.element.addEventListener('click', w.tempLightningHandler);
            }
        });

        document.body.style.cursor = 'crosshair';
    }

    /**
     * Create lightning bolt visual effect between two points
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     */
    createLightningBolt(x1, y1, x2, y2) {
        const lightning = document.createElement('div');
        const dx = x2 - x1;
        const dy = y2 - y1;
        // Use shared calculateDistance utility from utils.js
        const length = calculateDistance(x1, y1, x2, y2);
        const angle = Math.atan2(dy, dx);

        // Create jagged lightning path using SVG for better visuals
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Generate jagged lightning path with random deviations
        const segments = Math.max(3, Math.floor(length / 50)); // More segments for longer bolts
        let pathData = `M 0 0`;

        for (let i = 1; i < segments; i++) {
            const progress = i / segments;
            const targetX = length * progress;

            // Add random deviation perpendicular to line direction
            const deviation = (Math.random() - 0.5) * 30;

            pathData += ` L ${targetX} ${deviation}`;
        }
        pathData += ` L ${length} 0`; // End at target

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#00ffff');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('filter', 'url(#lightning-glow)');

        // Add glow filter
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'lightning-glow');

        const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        feGaussianBlur.setAttribute('stdDeviation', '3');
        feGaussianBlur.setAttribute('result', 'coloredBlur');

        const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');

        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        filter.appendChild(feGaussianBlur);
        filter.appendChild(feMerge);
        defs.appendChild(filter);

        svg.appendChild(defs);
        svg.appendChild(path);

        svg.style.cssText = `
            position: absolute;
            left: 0;
            top: -15px;
            width: ${length}px;
            height: 30px;
            overflow: visible;
            pointer-events: none;
        `;

        lightning.style.cssText = `
            position: fixed;
            left: ${x1}px;
            top: ${y1}px;
            transform-origin: 0 50%;
            transform: rotate(${angle}rad);
            z-index: 10002;
            pointer-events: none;
            animation: lightning-flash 0.3s ease-out;
        `;

        lightning.appendChild(svg);
        document.body.appendChild(lightning);

        // Create additional spark particles at impact point
        this.createLightningSparkles(x2, y2);

        setTimeout(() => {
            if (lightning.parentNode) {
                lightning.parentNode.removeChild(lightning);
            }
        }, 300);
    }

    /**
     * Create sparkle effect at lightning impact point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createLightningSparkles(x, y) {
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 20 + Math.random() * 20;

            sparkle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: #00ffff;
                border-radius: 50%;
                box-shadow: 0 0 8px #00ffff;
                animation: sparkle-burst 0.4s ease-out forwards;
                --angle-x: ${Math.cos(angle) * distance};
                --angle-y: ${Math.sin(angle) * distance};
                z-index: 10003;
                pointer-events: none;
            `;

            document.body.appendChild(sparkle);

            setTimeout(() => {
                if (sparkle.parentNode) {
                    sparkle.parentNode.removeChild(sparkle);
                }
            }, 400);
        }
    }

    /**
     * SPIDER: Spawns conversion spider that turns worms into more spiders
     */
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

    /**
     * Spawn a spider entity that chases and converts worms
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
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

        // Click to turn into heart → skull progression
        spider.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!spiderData.isHeart) {
                spider.textContent = '❤️';
                spiderData.isHeart = true;
                console.log(`🕷️ Spider clicked → ❤️`);

                // After 1 minute, turn to skull
                setTimeout(() => {
                    spider.textContent = '💀';
                    console.log(`❤️ → 💀`);

                    // After 10 seconds, remove skull
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

        // Spider AI: Chase nearest worm
        const moveSpider = () => {
            if (!spiderData.active || spiderData.isHeart) return;

            const activeWorms = this.wormSystem.worms.filter(w => w.active);
            if (activeWorms.length === 0) {
                console.log(`🕷️ No more worms to convert`);
                return;
            }

            // Find closest worm - use shared calculateDistance utility
            const closest = activeWorms.reduce((prev, curr) => {
                const prevDist = calculateDistance(prev.x, prev.y, spiderData.x, spiderData.y);
                const currDist = calculateDistance(curr.x, curr.y, spiderData.x, spiderData.y);
                return currDist < prevDist ? curr : prev;
            });

            const dist = calculateDistance(closest.x, closest.y, spiderData.x, spiderData.y);

            if (dist < 30) {
                // Convert worm → spider (chain reaction!)
                console.log(`🕷️ Spider converted worm ${closest.id} to another spider!`);
                this.wormSystem.removeWorm(closest);
                this.spawnSpider(closest.x, closest.y);

                // Remove this spider
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

    /**
     * DEVIL: Click to spawn devil magnet that attracts and kills worms
     */
    activateDevil() {
        console.log(`👹 DEVIL ACTIVATED! Click location to spawn devil...`);

        const handleClick = (e) => {
            this.spawnDevil(e.clientX, e.clientY);
            document.removeEventListener('click', handleClick);
            document.body.style.cursor = '';
        };

        document.addEventListener('click', handleClick);
        document.body.style.cursor = 'crosshair';
    }

    /**
     * Spawn devil entity that attracts worms and kills after proximity time
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
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
            wormProximity: new Map() // Track time each worm has been near
        };

        const checkProximity = () => {
            const activeWorms = this.wormSystem.worms.filter(w => w.active);

            activeWorms.forEach(worm => {
                // Use shared calculateDistance utility from utils.js
                const dist = calculateDistance(worm.x, worm.y, devilData.x, devilData.y);

                if (dist < this.DEVIL_PROXIMITY_DISTANCE) {
                    // Worm is near devil
                    if (!devilData.wormProximity.has(worm.id)) {
                        devilData.wormProximity.set(worm.id, Date.now());
                        console.log(`👹 Worm ${worm.id} attracted to devil`);
                    } else {
                        // Check if worm has been near long enough
                        const timeNear = Date.now() - devilData.wormProximity.get(worm.id);
                        if (timeNear >= this.DEVIL_KILL_TIME) {
                            console.log(`👹 Devil killed worm ${worm.id} after ${this.DEVIL_KILL_TIME / 1000}s proximity!`);
                            this.wormSystem.explodeWorm(worm, false, false);
                            devilData.wormProximity.delete(worm.id);
                        }
                    }

                    // Override worm behavior to rush toward devil
                    worm.isRushingToDevil = true;
                    worm.devilX = devilData.x;
                    worm.devilY = devilData.y;
                } else {
                    // Worm left proximity
                    if (devilData.wormProximity.has(worm.id)) {
                        console.log(`👹 Worm ${worm.id} escaped devil proximity`);
                        devilData.wormProximity.delete(worm.id);
                    }
                    worm.isRushingToDevil = false;
                }
            });

            // Continue checking if there are active worms
            if (activeWorms.length > 0) {
                requestAnimationFrame(checkProximity);
            } else {
                // No more worms, remove devil
                if (devil.parentNode) {
                    devil.parentNode.removeChild(devil);
                }
                console.log(`👹 Devil removed - no more worms`);
            }
        };

        checkProximity();
    }

    /**
     * Update power-up display UI
     */
    updateDisplay() {
        console.log(`📊 Power-ups: ⚡${this.inventory.chainLightning} 🕷️${this.inventory.spider} 👹${this.inventory.devil}${this.selectedPowerUp ? ` | Selected: ${this.selectedPowerUp}` : ''}`);

        if (!this.displayElement) {
            this.displayElement = this.createDisplayElement();
        }

        // Build display with selection highlighting
        const createItem = (type, emoji, count) => {
            const isSelected = this.selectedPowerUp === type;
            const hasStock = count > 0;
            const selectedStyle = isSelected ?
                'background: rgba(0, 255, 255, 0.4); border: 2px solid #0ff; box-shadow: 0 0 10px #0ff;' :
                'border: 2px solid transparent;';
            const availableStyle = hasStock ? 'opacity: 1;' : 'opacity: 0.5;';
            const cursorStyle = hasStock ? 'cursor: pointer;' : 'cursor: not-allowed;';

            let extraInfo = '';
            if (type === 'chainLightning' && count > 0) {
                extraInfo = `<div style="position: absolute; top: -10px; right: -10px; font-size: 12px; color: #0ff;">${this.chainLightningKillCount}</div>`;
            }
            if (isSelected) {
                extraInfo += `<div style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #0ff; white-space: nowrap;">SELECTED</div>`;
            }

            return `
                <div class="power-up-item" data-type="${type}" data-testid="powerup-${type}" 
                     style="${cursorStyle} padding: 8px; border-radius: 8px; transition: all 0.2s; position: relative; ${selectedStyle} ${availableStyle}">
                    ${emoji} ${count}
                    ${extraInfo}
                </div>
            `;
        };

        this.displayElement.innerHTML = `
            ${createItem('chainLightning', '⚡', this.inventory.chainLightning)}
            ${createItem('spider', '🕷️', this.inventory.spider)}
            ${createItem('devil', '👹', this.inventory.devil)}
        `;

        // Re-add click handlers and hover effects
        this.displayElement.querySelectorAll('.power-up-item').forEach(item => {
            const type = item.dataset.type;
            const hasStock = this.inventory[type] > 0;

            item.addEventListener('mouseenter', () => {
                if (hasStock && this.selectedPowerUp !== type) {
                    item.style.background = 'rgba(0, 255, 0, 0.3)';
                }
            });
            item.addEventListener('mouseleave', () => {
                if (this.selectedPowerUp !== type) {
                    item.style.background = 'transparent';
                }
            });
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectPowerUp(type);
            });
        });
    }

    /**
     * Create power-up display UI element
     * @returns {HTMLElement} Display element
     */
    createDisplayElement() {
        const display = document.createElement('div');
        display.id = 'power-up-display';
        display.dataset.testid = 'power-up-display';
        display.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 10px;
            font-family: 'Orbitron', monospace;
            font-size: 18px;
            z-index: 9999;
            display: flex;
            gap: 15px;
            border: 2px solid #0f0;
            cursor: move;
            user-select: none;
        `;

        // Make it draggable
        this.makeDraggable(display);

        document.body.appendChild(display);
        console.log('📊 Power-up display created (draggable, positioned at top-right)');
        return display;
    }

    /**
     * Make element draggable
     * @param {HTMLElement} element - Element to make draggable
     */
    makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        element.addEventListener('pointerdown', dragStart);
        document.addEventListener('pointermove', drag);
        document.addEventListener('pointerup', dragEnd);

        function dragStart(e) {
            // Only allow dragging from the display itself, not from power-up items
            if (e.target.classList.contains('power-up-item')) {
                return;
            }

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === element || e.target.parentElement === element) {
                isDragging = true;
                element.style.cursor = 'grabbing';
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                // Keep within viewport bounds
                const rect = element.getBoundingClientRect();
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;

                const boundedX = Math.max(0, Math.min(currentX, maxX));
                const boundedY = Math.max(0, Math.min(currentY, maxY));

                setTranslate(boundedX, boundedY, element);
            }
        }

        function dragEnd(e) {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                element.style.cursor = 'move';
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        }
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use in worm.js
window.WormPowerUpSystem = WormPowerUpSystem;
console.log('✅ WormPowerUpSystem class exported to window');
