// js/worm-powerups.js - Power-Up System for Worm Game
console.log("✨ Power-Up System Loading...");

/**
 * Manages all power-up logic including drop, collection, and activation
 * Extracted from WormSystem to improve maintainability
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

        // Timing constants
        this.SLIME_SPLAT_DURATION = 10000; // ms - power-up lifetime
        this.SPIDER_HEART_DURATION = 60000; // ms - 1 minute
        this.SKULL_DISPLAY_DURATION = 10000; // ms - 10 seconds
        this.DEVIL_PROXIMITY_DISTANCE = 50; // px
        this.DEVIL_KILL_TIME = 5000; // ms - 5 seconds near devil

        console.log('✨ Power-Up System initialized');
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
     * Use a power-up
     * @param {string} type - Power-up type to use
     */
    use(type) {
        if (this.inventory[type] <= 0) {
            console.log(`⚠️ No ${type} power-ups available!`);
            return;
        }

        console.log(`🎮 Using ${type} power-up!`);
        this.inventory[type]--;

        // Delegate to activation method
        const methodName = `activate${this.capitalize(type)}`;
        if (typeof this[methodName] === 'function') {
            this[methodName]();
        } else {
            console.error(`❌ Unknown power-up type: ${type}`);
        }

        this.updateDisplay();
    }

    /**
     * CHAIN LIGHTNING: Click worm to kill nearby worms
     */
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

            // Find closest worm
            const closest = activeWorms.reduce((prev, curr) => {
                const prevDist = Math.sqrt(Math.pow(prev.x - spiderData.x, 2) + Math.pow(prev.y - spiderData.y, 2));
                const currDist = Math.sqrt(Math.pow(curr.x - spiderData.x, 2) + Math.pow(curr.y - spiderData.y, 2));
                return currDist < prevDist ? curr : prev;
            });

            const dist = Math.sqrt(Math.pow(closest.x - spiderData.x, 2) + Math.pow(closest.y - spiderData.y, 2));

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
                const dist = Math.sqrt(Math.pow(worm.x - devilData.x, 2) + Math.pow(worm.y - devilData.y, 2));

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

        // Re-add click handlers and hover effects
        this.displayElement.querySelectorAll('.power-up-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(0, 255, 0, 0.3)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            item.addEventListener('click', () => {
                this.use(item.dataset.type);
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
        console.log('📊 Power-up display created');
        return display;
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
