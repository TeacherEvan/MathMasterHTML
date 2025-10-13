// js/worm.js - Enhanced Worm System with Crawling Behavior
console.log("🐛 Worm System Loading...");

class WormSystem {
    constructor() {
        this.worms = [];
        this.maxWorms = 999; // No practical limit - let chaos reign!
        this.wormContainer = null;
        this.solutionContainer = null;
        this.consoleElement = null;
        this.isInitialized = false;
        this.animationFrameId = null;
        this.spawnTimer = null;
        this.firstWormSpawned = false;
        this.lockedConsoleSlots = new Set(); // Track which console slots have active worms
        this.crossPanelContainer = null; // Container for cross-panel worm movement

        // ROW COMPLETION TRACKING
        this.rowsCompleted = 0; // Track number of rows completed in current problem

        // DIFFICULTY SCALING: Get current level from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentLevel = urlParams.get('level') || 'beginner';

        // DIFFICULTY SETTINGS PER LEVEL
        const difficultySettings = {
            beginner: {
                wormsPerRow: 3,
                speed: 1.0,
                roamTimeConsole: 8000,
                roamTimeBorder: 5000
            },
            warrior: {
                wormsPerRow: 5,
                speed: 1.5,
                roamTimeConsole: 6000,
                roamTimeBorder: 4000
            },
            master: {
                wormsPerRow: 8,
                speed: 2.0,
                roamTimeConsole: 4000,
                roamTimeBorder: 3000
            }
        };

        // Apply difficulty settings
        const settings = difficultySettings[currentLevel] || difficultySettings.beginner;
        this.wormsPerRow = settings.wormsPerRow;
        this.difficultySpeedMultiplier = settings.speed;
        this.difficultyRoamTimeConsole = settings.roamTimeConsole;
        this.difficultyRoamTimeBorder = settings.roamTimeBorder;

        this.additionalWormsPerRow = 0; // No additional escalation (already scaled by difficulty)

        console.log(`🎮 Difficulty: ${currentLevel.toUpperCase()} - ${this.wormsPerRow} worms/row, ${this.difficultySpeedMultiplier}x speed, ${this.difficultyRoamTimeBorder}ms roam`);

        // POWER-UP SYSTEM - Delegated to WormPowerUpSystem class
        this.powerUpSystem = null; // Will be initialized after DOM is ready

        // PERFORMANCE: DOM query caching
        this.cachedRevealedSymbols = null;
        this.revealedSymbolsCacheTime = 0;
        this.cachedContainerRect = null;
        this.containerRectCacheTime = 0;
        this.CACHE_DURATION_TARGETS = 100; // Refresh revealed symbols every 100ms
        this.CACHE_DURATION_RECT = 200; // Refresh container rect every 200ms

        // PERFORMANCE: Spawn batching queue to prevent frame drops
        this.spawnQueue = [];
        this.isProcessingSpawnQueue = false;

        // PERFORMANCE: Guard to prevent duplicate event listener registration
        this.eventListenersInitialized = false;

        // Cached DOM elements to avoid repeated getElementById calls
        this.cachedHelpButton = null;
        this.cachedPowerUpDisplay = null;
        this.cachedPanelC = null;
        this.cachedGameOverModal = null;

        // CONSTANTS: Extract magic numbers for better maintainability
        this.WORM_SEGMENT_COUNT = 5;
        this.WORM_Z_INDEX = 10000;
        // FIX 1: Reduced roaming times for faster worm effectiveness (was 10000/5000)
        this.ROAMING_DURATION_CONSOLE = 3000; // 3 seconds for console worms (was 10s)
        this.ROAMING_DURATION_BORDER = 5000; // 5 seconds for border worms (unchanged)
        // FIX 2: Base speeds (multiplied by difficulty scaling)
        this.SPEED_CONSOLE_WORM = 2.0 * this.difficultySpeedMultiplier;
        this.SPEED_FALLBACK_WORM = 1.0 * this.difficultySpeedMultiplier;
        this.SPEED_BORDER_WORM = 2.5 * this.difficultySpeedMultiplier;
        this.SPEED_PURPLE_WORM = 1.0; // Purple worm speed not scaled by difficulty
        this.SPAWN_QUEUE_DELAY = 50; // ms between spawn queue processing
        this.BORDER_MARGIN = 20; // px from viewport edge

        // POWER-UP CONSTANTS
        this.POWER_UP_DROP_RATE = 0.10; // 10% chance to drop power-up
        this.POWER_UP_TYPES = ['chainLightning', 'spider', 'devil'];

        // ANIMATION TIMING CONSTANTS
        this.EXPLOSION_CLEANUP_DELAY = 600; // ms - worm removal delay after explosion
        this.WORM_REMOVAL_DELAY = 500; // ms - delay before removing worm from DOM
        this.PROBLEM_COMPLETION_CLEANUP_DELAY = 2000; // ms - wait for explosions to finish
        this.SLIME_SPLAT_DURATION = 10000; // ms - 10 seconds
        this.SPIDER_HEART_DURATION = 60000; // ms - 1 minute
        this.SKULL_DISPLAY_DURATION = 10000; // ms - 10 seconds

        // WORM BEHAVIOR CONSTANTS
        this.CLONE_WORM_ROAM_DURATION = 10000; // ms - cloned worm roaming time
        this.DEVIL_PROXIMITY_DISTANCE = 50; // px
        this.DEVIL_KILL_TIME = 5000; // ms - 5 seconds

        console.log('🐛 WormSystem initialized with new row-based spawning and power-up system');
    }

    // PERFORMANCE: Setup event listeners once (called from initialize)
    setupEventListeners() {
        if (this.eventListenersInitialized) {
            console.log('⚠️ Event listeners already initialized, skipping...');
            return;
        }

        console.log('🎧 Setting up WormSystem event listeners...');

        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', (event) => {
            console.log('🐛 Worm System received problemLineCompleted event:', event.detail);
            this.rowsCompleted++;
            const wormsToSpawn = this.wormsPerRow + (this.rowsCompleted - 1) * this.additionalWormsPerRow;
            console.log(`📊 Row ${this.rowsCompleted} completed. Spawning ${wormsToSpawn} worms!`);

            // Spawn multiple worms spread around borders
            for (let i = 0; i < wormsToSpawn; i++) {
                this.queueWormSpawn('border', { index: i, total: wormsToSpawn });
            }
        });

        // CONSOLIDATED: Listen for problem completion (reset row counter + cleanup)
        document.addEventListener('problemCompleted', (event) => {
            console.log('🎉 Problem completed! Resetting row counter and cleaning up.');
            this.rowsCompleted = 0;

            // Kill all worms and clean up cracks
            console.log('🎯 Problem completed - killing all worms!');
            this.killAllWorms();

            // Clean up cracks after worms are killed
            setTimeout(() => {
                this.cleanupCracks();
            }, this.PROBLEM_COMPLETION_CLEANUP_DELAY); // Wait for explosions to finish
        });        // PURPLE WORM: Listen for purple worm trigger (3 wrong answers)
        document.addEventListener('purpleWormTriggered', (event) => {
            console.log('🟣 Purple Worm System received purpleWormTriggered event:', event.detail);
            this.queueWormSpawn('purple');
        });

        // Listen for symbol clicks in rain display to check if worm's target was clicked
        document.addEventListener('symbolClicked', (event) => {
            this.checkWormTargetClickForExplosion(event.detail.symbol);
        });

        // Listen for symbol reveals to trigger worm targeting
        document.addEventListener('symbolRevealed', (event) => {
            console.log('🎯 Symbol revealed event:', event.detail);
            this.notifyWormsOfRedSymbol(event.detail.symbol);
        });

        this.eventListenersInitialized = true;
        console.log('✅ WormSystem event listeners initialized');
    }

    // PERFORMANCE: Get cached revealed symbols (refreshes every 100ms instead of every frame)
    getCachedRevealedSymbols() {
        const now = Date.now();
        if (!this.cachedRevealedSymbols || (now - this.revealedSymbolsCacheTime) > this.CACHE_DURATION_TARGETS) {
            this.cachedRevealedSymbols = this.solutionContainer.querySelectorAll('.revealed-symbol');
            this.revealedSymbolsCacheTime = now;
        }
        return this.cachedRevealedSymbols;
    }

    // PERFORMANCE: Get cached container bounding rect (refreshes every 200ms instead of every frame)
    getCachedContainerRect() {
        const now = Date.now();
        if (!this.cachedContainerRect || (now - this.containerRectCacheTime) > this.CACHE_DURATION_RECT) {
            this.cachedContainerRect = this.wormContainer.getBoundingClientRect();
            this.containerRectCacheTime = now;
        }
        return this.cachedContainerRect;
    }

    // PERFORMANCE: Invalidate caches when symbols change
    invalidateSymbolCache() {
        this.cachedRevealedSymbols = null;
    }

    // PERFORMANCE: Queue worm spawn to prevent frame drops on multi-spawn
    queueWormSpawn(type, data = {}) {
        this.spawnQueue.push({ type, data, timestamp: Date.now() });
        console.log(`📋 Queued ${type} worm spawn. Queue length: ${this.spawnQueue.length}`);
        this.processSpawnQueue();
    }

    // PERFORMANCE: Process spawn queue one at a time with RAF spacing
    processSpawnQueue() {
        if (this.isProcessingSpawnQueue || this.spawnQueue.length === 0) return;

        this.isProcessingSpawnQueue = true;

        requestAnimationFrame(() => {
            const spawn = this.spawnQueue.shift();

            if (spawn.type === 'console') {
                this.spawnWormFromConsole();
            } else if (spawn.type === 'purple') {
                this.spawnPurpleWorm();
            } else if (spawn.type === 'border') {
                this.spawnWormFromBorder(spawn.data);
            }

            this.isProcessingSpawnQueue = false;

            // If more spawns queued, process next one after delay
            if (this.spawnQueue.length > 0) {
                setTimeout(() => this.processSpawnQueue(), this.SPAWN_QUEUE_DELAY);
                console.log(`⏱️ Processing next spawn in queue (${this.spawnQueue.length} remaining)...`);
            }
        });
    }

    // Check if rain symbol clicked matches worm's stolen symbol - EXPLODE WORM or TURN GREEN
    checkWormTargetClickForExplosion(clickedSymbol) {
        // REFACTORED: Use utility function for normalization
        const normalizedClicked = normalizeSymbol(clickedSymbol);

        // Check if any worm is carrying this symbol
        this.worms.forEach(worm => {
            if (!worm.active || !worm.hasStolen) return;

            const normalizedWormSymbol = normalizeSymbol(worm.stolenSymbol);

            if (normalizedWormSymbol === normalizedClicked) {
                // PURPLE WORM: Turn green when matching symbol clicked (must click worm to destroy)
                if (worm.isPurple) {
                    console.log(`🟣→🟢 User clicked rain symbol "${clickedSymbol}" - Purple worm ${worm.id} turns GREEN!`);

                    // Turn worm green (damaged state)
                    worm.element.style.filter = 'hue-rotate(120deg) brightness(1.2)'; // Purple → Green
                    worm.element.classList.remove('purple-worm');
                    worm.element.classList.add('worm-damaged', 'purple-turned-green');
                    worm.isPurple = false; // No longer purple
                    worm.canBeClicked = true; // Now clickable for destruction

                    // Flash effect
                    worm.element.style.animation = 'worm-flash-green 0.5s ease-out';
                    setTimeout(() => {
                        worm.element.style.animation = '';
                    }, 500);

                    // Update click handler to explode instead of clone
                    worm.element.removeEventListener('click', worm.clickHandler);
                    worm.clickHandler = (e) => {
                        e.stopPropagation();
                        console.log(`💥 Green (was purple) worm ${worm.id} clicked - EXPLODING!`);

                        // Drop power-up when purple worm (now green) is destroyed
                        this.dropPowerUp(worm.x, worm.y);

                        this.explodeWorm(worm, false);
                    };
                    worm.element.addEventListener('click', worm.clickHandler);

                    return;
                }

                // GREEN WORM: Explode immediately
                console.log(`💥 BOOM! User clicked rain symbol "${clickedSymbol}" - EXPLODING worm with stolen symbol!`);

                this.explodeWorm(worm, true); // Pass true to indicate this is a rain kill
            }
        });
    }

    // Notify roaming worms that a red symbol has appeared
    notifyWormsOfRedSymbol(symbolValue) {
        console.log(`🎯 Notifying worms of revealed red symbol: "${symbolValue}"`);

        this.worms.forEach(worm => {
            if (!worm.active || worm.hasStolen || worm.isRushingToTarget) return;

            // Worm stops roaming and rushes to this symbol
            console.log(`🐛 Worm ${worm.id} detected red symbol "${symbolValue}" - RUSHING TO TARGET!`);
            worm.isRushingToTarget = true;
            worm.targetSymbol = symbolValue;
            worm.roamingEndTime = Date.now(); // Stop roaming timer
        });
    }

    initialize() {
        if (this.isInitialized) return;

        this.wormContainer = document.getElementById('worm-container');
        this.solutionContainer = document.getElementById('solution-container');
        this.consoleElement = document.getElementById('symbol-console');

        // Create cross-panel container for worms to roam all panels
        if (!this.crossPanelContainer) {
            this.crossPanelContainer = document.createElement('div');
            this.crossPanelContainer.id = 'cross-panel-worm-container';
            this.crossPanelContainer.style.position = 'fixed';
            this.crossPanelContainer.style.top = '0';
            this.crossPanelContainer.style.left = '0';
            this.crossPanelContainer.style.width = '100vw';
            this.crossPanelContainer.style.height = '100vh';
            this.crossPanelContainer.style.pointerEvents = 'none'; // Let clicks pass through
            this.crossPanelContainer.style.zIndex = '10000';
            document.body.appendChild(this.crossPanelContainer);
            console.log('🌍 Cross-panel worm container created');
        }

        if (!this.wormContainer) {
            console.error('🐛 Worm container #worm-container not found!');
            return;
        }

        if (!this.solutionContainer) {
            console.error('🐛 Solution container not found!');
            return;
        }

        if (!this.consoleElement) {
            console.error('🐛 Console element not found!');
            // Continue even if console not found (mobile mode)
        }

        // Ensure container has relative positioning for absolute children
        if (getComputedStyle(this.wormContainer).position === 'static') {
            this.wormContainer.style.position = 'relative';
        }

        // PERFORMANCE: Cache frequently-accessed DOM elements
        this.cachedHelpButton = document.getElementById('help-button');
        this.cachedPowerUpDisplay = document.getElementById('power-up-display');
        this.cachedPanelC = document.getElementById('third-display');
        this.cachedGameOverModal = document.getElementById('game-over-modal');
        console.log('💾 Cached DOM elements: helpButton, powerUpDisplay, panelC, gameOverModal');

        // Initialize Power-Up System
        if (!this.powerUpSystem && window.WormPowerUpSystem) {
            this.powerUpSystem = new WormPowerUpSystem(this);
            console.log('✨ Power-Up System initialized');
        }

        // PERFORMANCE: Setup event listeners once
        this.setupEventListeners();

        this.isInitialized = true;
        console.log('✅ Worm System initialized successfully');
    }

    // Find an empty console slot to spawn worm from
    findEmptyConsoleSlot() {
        if (!this.consoleElement) return null;

        const slots = this.consoleElement.querySelectorAll('.console-slot');
        const emptySlots = [];

        slots.forEach((slot, index) => {
            // Check if slot is empty and not locked by an active worm
            if (!slot.textContent && !this.lockedConsoleSlots.has(index)) {
                emptySlots.push({ element: slot, index: index });
            }
        });

        if (emptySlots.length === 0) {
            console.log('⚠️ No empty console slots available for worm spawn');
            return null;
        }

        // Return random empty slot
        return emptySlots[Math.floor(Math.random() * emptySlots.length)];
    }

    /**
     * FACTORY METHOD: Create worm element with consistent structure
     * Eliminates ~200 lines of duplicate code across spawn methods
     * @param {Object} config - Worm configuration
     * @param {string} config.id - Unique worm ID
     * @param {string[]} config.classNames - Additional CSS classes
     * @param {number} config.segmentCount - Number of worm segments (default: 5)
     * @param {number} config.x - Starting X position
     * @param {number} config.y - Starting Y position
     * @returns {HTMLElement} Configured worm element
     */
    createWormElement(config) {
        const {
            id,
            classNames = [],
            segmentCount = this.WORM_SEGMENT_COUNT,
            x,
            y
        } = config;

        // Create main worm container
        const wormElement = document.createElement('div');
        wormElement.className = ['worm-container', ...classNames].join(' ');
        wormElement.id = id;

        // Create worm body with segments
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        for (let i = 0; i < segmentCount; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        wormElement.appendChild(wormBody);

        // Apply consistent positioning and styling
        wormElement.style.left = `${x}px`;
        wormElement.style.top = `${y}px`;
        wormElement.style.position = 'fixed';
        wormElement.style.zIndex = String(this.WORM_Z_INDEX);
        wormElement.style.opacity = '1';
        wormElement.style.visibility = 'visible';
        wormElement.style.pointerEvents = 'auto';

        return wormElement;
    }

    // ===================================================================
    // UNIVERSAL WORM SPAWNER (Phase 2 Refactoring)
    // ===================================================================

    /**
     * Universal worm spawner - handles all spawn types
     * @param {Object} config - Spawn configuration
     * @returns {Object|null} - Worm data or null if spawn failed
     */
    spawnWormUniversal(config = {}) {
        this.initialize();

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. No more spawning.`);
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
            roamDuration: this.difficultyRoamTimeConsole,
            classNames: [],
            borderIndex: 0,
            borderTotal: 1,
            shouldExitToConsole: false
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
        const wormId = generateUniqueId(cfg.type === 'purple' ? 'purple-worm' : cfg.type === 'border' ? 'border-worm' : 'worm');
        const wormElement = this.createWormElement({
            id: wormId,
            classNames: cfg.classNames,
            segmentCount: this.WORM_SEGMENT_COUNT,
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
            shouldExitToConsole: cfg.shouldExitToConsole,
            exitingToConsole: false,
            targetConsoleSlot: null,

            // Power-up
            hasPowerUp: hasPowerUp,
            powerUpType: powerUpType,

            // State
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: null,
            isFlickering: false
        };

        // Purple worm specific flags
        if (cfg.isPurple) {
            wormData.prioritizeRed = true;
        }

        if (hasPowerUp) {
            console.log(`✨ Worm ${wormId} has power-up: ${powerUpType}`);
        }

        this.worms.push(wormData);

        // Add click handler
        const clickHandler = cfg.isPurple ?
            (e) => { e.stopPropagation(); this.handlePurpleWormClick(wormData); } :
            (e) => { e.stopPropagation(); this.handleWormClick(wormData); };

        wormElement.addEventListener('click', clickHandler);

        // Store click handler reference for cleanup
        if (cfg.isPurple) {
            wormData.clickHandler = clickHandler;
        }

        console.log(`✅ Worm ${wormId} spawned at (${cfg.x.toFixed(0)}, ${cfg.y.toFixed(0)}). Total: ${this.worms.length}`);

        // Start animation if first worm
        if (this.worms.length === 1) {
            this.animate();
        }

        return wormData;
    }

    /**
     * Calculate spawn position based on spawn type
     * @param {String} type - Spawn type ('normal', 'console', 'border', 'purple')
     * @param {Object} config - Configuration object
     * @returns {Object} - {x, y} coordinates
     */
    calculateSpawnPosition(type, config) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        switch (type) {
            case 'console':
                if (!config.consoleSlotElement) {
                    console.warn('⚠️ Console spawn without slot element, using fallback');
                    return { x: Math.random() * viewportWidth, y: viewportHeight - 30 };
                }
                const slotRect = config.consoleSlotElement.getBoundingClientRect();
                return {
                    x: slotRect.left + (slotRect.width / 2),
                    y: slotRect.top + (slotRect.height / 2)
                };

            case 'border':
                const position = config.borderIndex / config.borderTotal;
                const margin = this.BORDER_MARGIN;

                if (position < 0.5) {
                    // Bottom edge (0-50%)
                    const xPosition = position * 2;
                    return {
                        x: margin + xPosition * (viewportWidth - 2 * margin),
                        y: viewportHeight - margin
                    };
                } else if (position < 0.75) {
                    // Left edge (50-75%)
                    const yPosition = (position - 0.5) * 4;
                    return {
                        x: margin,
                        y: margin + yPosition * (viewportHeight - 2 * margin)
                    };
                } else {
                    // Right edge (75-100%)
                    const yPosition = (position - 0.75) * 4;
                    return {
                        x: viewportWidth - margin,
                        y: margin + yPosition * (viewportHeight - 2 * margin)
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
                    x: Math.random() * Math.max(0, viewportWidth - 80),
                    y: -50
                };

            default: // 'normal'
                return {
                    x: Math.random() * Math.max(0, viewportWidth - 80),
                    y: Math.max(0, viewportHeight - 30)
                };
        }
    }

    // ===================================================================
    // BACKWARD-COMPATIBLE SPAWN WRAPPERS (call spawnWormUniversal)
    // ===================================================================

    // Spawn worm from console slot with slide-open animation
    spawnWormFromConsole() {
        // Find empty console slot
        const slotData = this.findEmptyConsoleSlot();
        if (!slotData) {
            console.log('⚠️ All console slots occupied or locked, spawning worm normally');
            return this.spawnWorm(); // Fallback to normal spawn
        }

        const { element: slotElement, index: slotIndex } = slotData;

        return this.spawnWormUniversal({
            type: 'console',
            fromConsole: true,
            consoleSlotIndex: slotIndex,
            consoleSlotElement: slotElement,
            speed: this.SPEED_CONSOLE_WORM,
            roamDuration: this.difficultyRoamTimeConsole,
            classNames: ['console-worm']
        });
    }

    // Fallback spawn method for when console slots are all occupied
    spawnWorm() {
        return this.spawnWormUniversal({
            type: 'normal',
            speed: this.SPEED_FALLBACK_WORM,
            roamDuration: this.difficultyRoamTimeConsole
        });
    }

    // Spawn worm from border (bottom or sides) - used for row completion
    spawnWormFromBorder(data = {}) {
        const { index = 0, total = 1 } = data;

        return this.spawnWormUniversal({
            type: 'border',
            borderIndex: index,
            borderTotal: total,
            speed: this.SPEED_BORDER_WORM,
            roamDuration: this.difficultyRoamTimeBorder,
            shouldExitToConsole: true
        });
    }

    // PURPLE WORM: Spawn purple worm triggered by 2+ wrong answers
    spawnPurpleWorm() {
        return this.spawnWormUniversal({
            type: 'purple',
            isPurple: true,
            canStealBlue: true,
            speed: this.SPEED_PURPLE_WORM,
            classNames: ['purple-worm'],
            shouldExitToConsole: true
        });
    }

    stealSymbol(worm) {
        // CROSS-PANEL CHECK: Worm can only steal symbols when inside Panel B
        // PERFORMANCE: Use cached container rect instead of live query
        const panelBRect = this.getCachedContainerRect();
        const wormInPanelB = (
            worm.x >= panelBRect.left &&
            worm.x <= panelBRect.right &&
            worm.y >= panelBRect.top &&
            worm.y <= panelBRect.bottom
        );

        if (!wormInPanelB) {
            console.log(`🐛 Worm ${worm.id} outside Panel B - cannot steal symbols`);
            // Continue roaming
            worm.roamingEndTime = Date.now() + 5000;
            worm.isRushingToTarget = false;
            return;
        }

        // PERFORMANCE: Use cached revealed symbols instead of querying every time
        const revealedSymbols = this.getCachedRevealedSymbols();

        // Get all available symbols (not stolen, not spaces, not completed)
        const allAvailableSymbols = Array.from(revealedSymbols).filter(el =>
            !el.dataset.stolen &&
            !el.classList.contains('space-symbol') &&
            !el.classList.contains('completed-row-symbol')
        );

        // PURPLE WORM LOGIC: Only steal blue symbols when NO red symbols available
        let availableSymbols;
        if (worm.canStealBlue && worm.isPurple) {
            // First, try to get red (hidden) symbols only
            const redSymbols = allAvailableSymbols.filter(el =>
                el.classList.contains('hidden-symbol')
            );

            if (redSymbols.length > 0) {
                // Red symbols available - purple worm steals red symbols like normal
                availableSymbols = redSymbols;
                console.log(`🟣 PURPLE WORM - ${redSymbols.length} red symbols available (preferring red)`);
            } else {
                // NO red symbols - now purple worm can steal blue symbols!
                const blueSymbols = allAvailableSymbols.filter(el =>
                    el.classList.contains('revealed-symbol')
                );
                availableSymbols = blueSymbols;
                console.log(`🟣 PURPLE WORM - NO red symbols! Stealing blue symbols (${blueSymbols.length} available)`);
            }
        } else {
            // Normal worm - only steal red (hidden) symbols
            availableSymbols = allAvailableSymbols.filter(el =>
                el.classList.contains('hidden-symbol')
            );
            console.log(`🐛 Normal worm - ${availableSymbols.length} red symbols available`);
        }

        if (availableSymbols.length === 0) {
            console.log('🐛 No symbols available to steal');
            // Continue roaming
            worm.roamingEndTime = Date.now() + 5000;
            worm.isRushingToTarget = false;
            return;
        }

        // If worm has a target symbol, try to find it
        let targetSymbol = null;
        if (worm.targetSymbol) {
            const normalizedTarget = worm.targetSymbol.toLowerCase() === 'x' ? 'X' : worm.targetSymbol;
            targetSymbol = availableSymbols.find(el => {
                const elSymbol = el.textContent.toLowerCase() === 'x' ? 'X' : el.textContent;
                return elSymbol === normalizedTarget;
            });
        }

        // If no specific target or target not found, pick random
        if (!targetSymbol) {
            targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        }

        const symbolValue = targetSymbol.textContent;
        const wasBlueSymbol = targetSymbol.classList.contains('revealed-symbol');

        console.log(`🐛 Worm ${worm.id} stealing ${wasBlueSymbol ? 'BLUE' : 'RED'} symbol: "${symbolValue}"`);

        // Mark symbol as stolen and hide it
        targetSymbol.dataset.stolen = 'true';
        targetSymbol.classList.add('stolen');
        targetSymbol.classList.remove('revealed-symbol');
        targetSymbol.classList.add('hidden-symbol'); // Hide it again until user re-clicks in rain
        targetSymbol.style.visibility = 'hidden';

        // Update worm data
        worm.stolenSymbol = symbolValue;
        worm.targetElement = targetSymbol;
        worm.hasStolen = true;
        worm.isRushingToTarget = false;
        worm.element.dataset.stolenSymbol = symbolValue;
        worm.wasBlueSymbol = wasBlueSymbol; // Track if it was blue

        // ACTIVATE LSD FLICKER when stealing symbol!
        console.log(`🌈 Worm ${worm.id} stole ${wasBlueSymbol ? 'blue' : 'red'} symbol - ACTIVATING LSD FLICKER with 20% SPEED BOOST!`);
        worm.isFlickering = true;
        worm.element.classList.add('flickering');
        worm.currentSpeed = worm.baseSpeed * 1.2; // 20% speed boost!

        // Add stolen symbol indicator (symbol follows worm)
        const stolenSymbolDiv = document.createElement('div');
        stolenSymbolDiv.className = 'carried-symbol';
        stolenSymbolDiv.textContent = symbolValue;
        if (wasBlueSymbol) {
            stolenSymbolDiv.style.color = '#00ffff'; // Cyan for stolen blue symbols
        }
        worm.element.appendChild(stolenSymbolDiv);

        console.log(`🐛 Worm now carrying "${symbolValue}" and heading back to console hole!`);

        // GAME OVER CHECK: Did worm steal the last available symbol?
        this.checkGameOverCondition();
    }

    // GAME OVER: Check if all symbols have been stolen
    checkGameOverCondition() {
        const revealedSymbols = this.getCachedRevealedSymbols();
        const availableSymbols = Array.from(revealedSymbols).filter(el =>
            !el.dataset.stolen &&
            !el.classList.contains('space-symbol') &&
            !el.classList.contains('completed-row-symbol')
        );

        if (availableSymbols.length === 0) {
            console.log('💀 GAME OVER! All symbols stolen!');
            this.triggerGameOver();
        }
    }

    // GAME OVER: Trigger game over sequence
    triggerGameOver() {
        // Pause worm animations
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove a random console symbol as penalty (if any exist)
        this.removeRandomConsoleSymbol();

        // Show Game Over modal
        this.showGameOverModal();
    }

    // Remove random symbol from console as penalty
    removeRandomConsoleSymbol() {
        if (!window.consoleManager) return;

        const filledSlots = [];
        window.consoleManager.slots.forEach((symbol, index) => {
            if (symbol !== null) {
                filledSlots.push(index);
            }
        });

        if (filledSlots.length === 0) {
            console.log('⚠️ No console symbols to remove');
            return;
        }

        // Pick random filled slot
        const randomIndex = filledSlots[Math.floor(Math.random() * filledSlots.length)];
        const removedSymbol = window.consoleManager.slots[randomIndex];

        // Remove it
        window.consoleManager.slots[randomIndex] = null;
        window.consoleManager.updateConsoleDisplay();
        window.consoleManager.saveProgress();

        console.log(`💔 PENALTY: Removed "${removedSymbol}" from console slot ${randomIndex + 1}`);
    }

    // Show Game Over modal
    showGameOverModal() {
        // PERFORMANCE: Use cached element or create if doesn't exist
        let modal = this.cachedGameOverModal || document.getElementById('game-over-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'game-over-modal';
            modal.className = 'game-over-modal';
            modal.innerHTML = `
                <div class="game-over-content">
                    <h1 class="game-over-title">💀 GAME OVER! 💀</h1>
                    <p class="game-over-message">All symbols have been stolen by worms!</p>
                    <p class="game-over-penalty">Penalty: Lost 1 console symbol</p>
                    <button class="game-over-button" onclick="location.reload()">Try Again</button>
                    <button class="game-over-button secondary" onclick="window.location.href='level-select.html'">Back to Levels</button>
                </div>
            `;
            document.body.appendChild(modal);
            this.cachedGameOverModal = modal; // Cache the newly created modal
        }

        // Show modal with animation
        setTimeout(() => {
            modal.style.display = 'flex';
            modal.style.opacity = '1';
        }, 100);
    }

    animate() {
        if (this.worms.length === 0) {
            this.animationFrameId = null;
            return;
        }

        this.worms.forEach(worm => {
            if (!worm.active) return;

            // Update crawl phase for animation
            worm.crawlPhase = (worm.crawlPhase + 0.05) % (Math.PI * 2);

            // Update behavior based on state
            this.updateWormBehavior(worm);

            // Apply position to DOM
            worm.element.style.left = `${worm.x}px`;
            worm.element.style.top = `${worm.y}px`;
        });

        // Continue animation if there are active worms
        if (this.worms.some(w => w.active)) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationFrameId = null;
        }
    }

    /**
     * Update worm behavior based on current state (dispatcher method)
     * @param {Object} worm - Worm data object
     */
    updateWormBehavior(worm) {
        const currentTime = Date.now();

        // Priority 1: Devil override
        if (worm.isRushingToDevil && worm.devilX !== undefined && worm.devilY !== undefined) {
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
        } else if (worm.hasStolen && worm.fromConsole && worm.consoleSlotElement) {
            this.updateConsoleReturnBehavior(worm);
        } else if (worm.hasStolen) {
            this.updateCarryingBehavior(worm);
        }
    }

    /**
     * Update worm behavior when rushing to devil power-up
     * @param {Object} worm - Worm data object
     */
    updateDevilBehavior(worm) {
        const distance = calculateDistance(worm.x, worm.y, worm.devilX, worm.devilY);
        const dx = worm.devilX - worm.x;
        const dy = worm.devilY - worm.y;

        if (distance <= 5) return; // Already at devil

        // Rush toward devil at double speed
        const rushSpeed = worm.baseSpeed * 2;
        worm.velocityX = (dx / distance) * rushSpeed;
        worm.velocityY = (dy / distance) * rushSpeed;

        worm.x += worm.velocityX;
        worm.y += worm.velocityY;

        // Rotate towards devil
        worm.element.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI}rad)`;
    }

    /**
     * Update worm behavior when rushing to steal a symbol
     * @param {Object} worm - Worm data object
     */
    updateRushingBehavior(worm) {
        // PERFORMANCE: Use cached revealed symbols
        const revealedSymbols = this.getCachedRevealedSymbols();
        let targetElement = null;

        if (worm.targetSymbol) {
            const normalizedTarget = worm.targetSymbol.toLowerCase() === 'x' ? 'X' : worm.targetSymbol;
            targetElement = Array.from(revealedSymbols).find(el => {
                const elSymbol = el.textContent.toLowerCase() === 'x' ? 'X' : el.textContent;
                return elSymbol === normalizedTarget && !el.dataset.stolen;
            });
        }

        if (targetElement) {
            // Rush towards target symbol
            const targetRect = targetElement.getBoundingClientRect();
            
            // FIX: Worms use viewport coordinates (fixed positioning), so use absolute coordinates
            const targetX = targetRect.left + (targetRect.width / 2);
            const targetY = targetRect.top + (targetRect.height / 2);

            const distance = calculateDistance(worm.x, worm.y, targetX, targetY);
            const dx = targetX - worm.x;
            const dy = targetY - worm.y;

            if (distance < 30) {
                // Reached target - steal it!
                this.stealSymbol(worm);
            } else {
                // Move towards target at double speed
                const rushSpeed = worm.baseSpeed * 2;
                worm.velocityX = (dx / distance) * rushSpeed;
                worm.velocityY = (dy / distance) * rushSpeed;

                worm.x += worm.velocityX;
                worm.y += worm.velocityY;
            }
        } else {
            // Target disappeared, go back to roaming
            console.log(`🐛 Worm ${worm.id} lost target, resuming roaming`);
            worm.isRushingToTarget = false;
            worm.roamingEndTime = Date.now() + 5000;
        }
    }

    /**
     * Update worm behavior when roaming (before stealing)
     * @param {Object} worm - Worm data object
     */
    updateRoamingBehavior(worm) {
        // Update direction slightly for natural movement
        worm.direction += (Math.random() - 0.5) * 0.1;

        // Crawling movement with inchworm effect
        const crawlOffset = Math.sin(worm.crawlPhase) * 0.5;
        worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
        worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

        worm.x += worm.velocityX;
        worm.y += worm.velocityY;

        // Apply viewport boundaries
        this.applyViewportBoundaries(worm);

        // Rotate worm body to face movement direction (head points forward)
        worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
    }

    /**
     * Update worm behavior when returning to console with stolen symbol
     * @param {Object} worm - Worm data object
     */
    updateConsoleReturnBehavior(worm) {
        const slotRect = worm.consoleSlotElement.getBoundingClientRect();
        
        // FIX: Worms use viewport coordinates (fixed positioning), so use absolute coordinates
        const targetX = slotRect.left + (slotRect.width / 2);
        const targetY = slotRect.top + (slotRect.height / 2);

        const distance = calculateDistance(worm.x, worm.y, targetX, targetY);
        const dx = targetX - worm.x;
        const dy = targetY - worm.y;

        if (distance < 20) {
            // Reached console hole - escape with symbol!
            console.log(`🐛 Worm ${worm.id} escaped to console with symbol "${worm.stolenSymbol}"!`);
            console.log(`💀 Symbol "${worm.stolenSymbol}" stays HIDDEN until user clicks it again in Panel C`);
            this.removeWorm(worm);
            return;
        }

        // Move towards console
        worm.direction = Math.atan2(dy, dx);
        worm.velocityX = (dx / distance) * worm.currentSpeed;
        worm.velocityY = (dy / distance) * worm.currentSpeed;

        worm.x += worm.velocityX;
        worm.y += worm.velocityY;

        // Rotate towards console (head points forward)
        worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
    }

    /**
     * Update worm behavior when carrying stolen symbol (not from console)
     * @param {Object} worm - Worm data object
     */
    updateCarryingBehavior(worm) {
        // PURPLE WORM CONSOLE EXIT: If this is a purple worm, exit through console
        if (worm.isPurple && worm.shouldExitToConsole) {
            // Find empty console slot if not already targeting one
            if (!worm.exitingToConsole) {
                const emptySlotData = this.findEmptyConsoleSlot();
                if (emptySlotData) {
                    worm.exitingToConsole = true;
                    worm.targetConsoleSlot = emptySlotData.element;
                    worm.targetConsoleSlotIndex = emptySlotData.index;
                    console.log(`🟣 Purple worm ${worm.id} heading to exit at console slot ${emptySlotData.index}`);
                }
            }

            // If targeting a console slot, move toward it
            if (worm.exitingToConsole && worm.targetConsoleSlot) {
                const slotRect = worm.targetConsoleSlot.getBoundingClientRect();
                
                // FIX: Worms use viewport coordinates (fixed positioning), so use absolute coordinates
                const targetX = slotRect.left + (slotRect.width / 2);
                const targetY = slotRect.top + (slotRect.height / 2);

                const distance = calculateDistance(worm.x, worm.y, targetX, targetY);
                const dx = targetX - worm.x;
                const dy = targetY - worm.y;

                if (distance < 20) {
                    // Reached console exit - purple worm escapes!
                    console.log(`🟣 Purple worm ${worm.id} exited through console!`);
                    this.removeWorm(worm);
                    return;
                }

                // Move towards console exit
                worm.direction = Math.atan2(dy, dx);
                worm.velocityX = (dx / distance) * worm.currentSpeed;
                worm.velocityY = (dy / distance) * worm.currentSpeed;

                worm.x += worm.velocityX;
                worm.y += worm.velocityY;

                // Rotate towards console (head points forward)
                worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
            } else {
                // No console slot found yet, continue roaming
                this.updateRoamingBehavior(worm);
            }
        } else {
            // Normal worm carrying symbol - continue roaming
            this.updateRoamingBehavior(worm);
        }

        // Apply Panel B boundaries for carrying worms
        this.applyPanelBBoundaries(worm);
    }

    /**
     * Apply viewport boundaries to worm position (for roaming worms)
     * @param {Object} worm - Worm data object
     */
    applyViewportBoundaries(worm) {
        const margin = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (worm.x < margin) {
            worm.x = margin;
            worm.direction = Math.PI - worm.direction; // Reflect horizontally
        }
        if (worm.x > viewportWidth - margin) {
            worm.x = viewportWidth - margin;
            worm.direction = Math.PI - worm.direction;
        }
        if (worm.y < margin) {
            worm.y = margin;
            worm.direction = -worm.direction; // Reflect vertically
        }
        if (worm.y > viewportHeight - margin) {
            worm.y = viewportHeight - margin;
            worm.direction = -worm.direction;
        }
    }

    /**
     * Apply Panel B boundaries to worm position (for carrying worms)
     * @param {Object} worm - Worm data object
     */
    applyPanelBBoundaries(worm) {
        const margin = 20;
        const panelBRect = this.getCachedContainerRect();
        const panelBWidth = panelBRect.width;
        const panelBHeight = panelBRect.height;

        if (worm.x < margin) {
            worm.x = margin;
            worm.direction = Math.PI - worm.direction;
        }
        if (worm.x > panelBWidth - margin) {
            worm.x = panelBWidth - margin;
            worm.direction = Math.PI - worm.direction;
        }
        if (worm.y < margin) {
            worm.y = margin;
            worm.direction = -worm.direction;
        }
        if (worm.y > panelBHeight - margin) {
            worm.y = panelBHeight - margin;
            worm.direction = -worm.direction;
        }

        // Rotate worm to face movement direction (head points forward)
        worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
    }

    /**
     * Check if worm is currently inside Panel B boundaries
     * @param {Object} worm - Worm data object
     * @returns {Boolean} - True if worm is in Panel B
     */
    isWormInPanelB(worm) {
        const panelBRect = this.getCachedContainerRect();
        return (
            worm.x >= panelBRect.left &&
            worm.x <= panelBRect.right &&
            worm.y >= panelBRect.top &&
            worm.y <= panelBRect.bottom
        );
    }

    handleWormClick(worm) {
        if (!worm.active) return;

        // GREEN WORMS: Always explode on click (no cloning)
        console.log(`💥 Green worm ${worm.id} clicked - EXPLODING!`);

        // Drop power-up if this worm has one
        if (worm.hasPowerUp) {
            this.dropPowerUp(worm.x, worm.y, worm.powerUpType);
        }

        this.explodeWorm(worm, false); // false = not a rain kill
    }

    // PURPLE WORM: Special click handler - always clones
    handlePurpleWormClick(worm) {
        if (!worm.active) return;

        console.log(`🟣 Purple worm ${worm.id} clicked - CREATING CLONE!`);

        // Visual feedback
        worm.element.style.animation = 'worm-flash-purple 0.5s ease-out';
        setTimeout(() => {
            worm.element.style.animation = '';
        }, 500);

        // Clone the purple worm
        this.clonePurpleWorm(worm);
    }

    cloneWorm(parentWorm) {
        if (!parentWorm.active) return;

        console.log(`🐛 Worm ${parentWorm.id} clicked! Creating CLONE with same mission...`);

        // Check if we can spawn more worms
        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot clone.`);
            // Flash effect to indicate max reached
            parentWorm.element.style.animation = 'worm-flash 0.3s ease-out';
            setTimeout(() => {
                parentWorm.element.style.animation = '';
            }, 300);
            return;
        }

        // Create a new worm near the parent
        const newWormId = `worm-clone-${Date.now()}-${Math.random()}`;
        const newWormElement = document.createElement('div');
        newWormElement.className = 'worm-container';
        newWormElement.id = newWormId;

        // Worm body with segments
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        newWormElement.appendChild(wormBody);

        // Position near parent worm with slight offset - USE VIEWPORT COORDINATES
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        const newX = Math.max(0, Math.min(window.innerWidth - 50, parentWorm.x + offsetX));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, parentWorm.y + offsetY));

        newWormElement.style.left = `${newX}px`;
        newWormElement.style.top = `${newY}px`;
        newWormElement.style.position = 'fixed'; // Use fixed for viewport positioning
        newWormElement.style.zIndex = '10000';
        newWormElement.style.opacity = '1';
        newWormElement.style.visibility = 'visible';
        newWormElement.style.pointerEvents = 'auto'; // Allow clicks

        this.crossPanelContainer.appendChild(newWormElement); // Use cross-panel container

        // Create clone with SAME MISSION as parent
        const cloneData = {
            id: newWormId,
            element: newWormElement,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: parentWorm.targetSymbol, // SAME TARGET as parent!
            x: newX,
            y: newY,
            velocityX: (Math.random() - 0.5) * 2.0,
            velocityY: (Math.random() - 0.5) * 1.0,
            active: true,
            hasStolen: false,
            isRushingToTarget: parentWorm.isRushingToTarget, // Inherit rushing state
            roamingEndTime: Date.now() + this.CLONE_WORM_ROAM_DURATION,
            isFlickering: false,
            baseSpeed: 2.0,
            currentSpeed: 2.0,
            fromConsole: false, // Clones don't return to console
            crawlPhase: Math.random() * Math.PI * 2,
            direction: Math.random() * Math.PI * 2
        };

        this.worms.push(cloneData);

        // Add click handler with RISK/REWARD: 80% kill, 20% multiply!
        newWormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleWormClick(cloneData);
        });

        // Clone birth effect on both worms
        parentWorm.element.classList.add('worm-multiply');
        newWormElement.classList.add('worm-multiply');

        setTimeout(() => {
            parentWorm.element.classList.remove('worm-multiply');
            newWormElement.classList.remove('worm-multiply');
        }, 500);

        console.log(`✅ Worm cloned! New clone ${newWormId} targeting same symbol: "${cloneData.targetSymbol || 'any'}". Total worms: ${this.worms.length}`);

        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    // PURPLE WORM: Clone purple worm (maintains purple properties)
    clonePurpleWorm(parentWorm) {
        if (!parentWorm.active) return;

        console.log(`🟣 Purple worm ${parentWorm.id} cloning! Creating purple clone...`);

        // Check if we can spawn more worms
        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot clone.`);
            parentWorm.element.style.animation = 'worm-flash 0.3s ease-out';
            setTimeout(() => {
                parentWorm.element.style.animation = '';
            }, 300);
            return;
        }

        // Create purple clone near parent
        const newWormId = `purple-clone-${Date.now()}-${Math.random()}`;
        const newWormElement = document.createElement('div');
        newWormElement.className = 'worm-container purple-worm';
        newWormElement.id = newWormId;

        // Worm body with segments
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        newWormElement.appendChild(wormBody);

        // Position clone near parent with random offset - USE VIEWPORT COORDINATES
        const offset = 30;
        const newX = Math.max(0, Math.min(window.innerWidth - 50, parentWorm.x + (Math.random() - 0.5) * offset * 2));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, parentWorm.y + (Math.random() - 0.5) * offset * 2));

        newWormElement.style.left = `${newX}px`;
        newWormElement.style.top = `${newY}px`;
        newWormElement.style.position = 'fixed'; // Use fixed for viewport positioning
        newWormElement.style.zIndex = '10000';
        newWormElement.style.opacity = '1';
        newWormElement.style.visibility = 'visible';
        newWormElement.style.pointerEvents = 'auto'; // Allow clicks

        this.crossPanelContainer.appendChild(newWormElement); // Use cross-panel container

        // Create purple clone data
        const cloneData = {
            id: newWormId,
            element: newWormElement,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: parentWorm.targetSymbol,
            x: newX,
            y: newY,
            velocityX: (Math.random() - 0.5) * 2.0,
            velocityY: (Math.random() - 0.5) * 1.0,
            active: true,
            hasStolen: false,
            isRushingToTarget: parentWorm.isRushingToTarget,
            roamingEndTime: Date.now() + 8000,
            isFlickering: false,
            baseSpeed: 2.0,
            currentSpeed: 2.0,
            isPurple: true, // Maintain purple status
            canStealBlue: true, // Can steal blue symbols
            fromConsole: false,
            crawlPhase: Math.random() * Math.PI * 2,
            direction: Math.random() * Math.PI * 2
        };

        this.worms.push(cloneData);

        // Purple worm click handler (50% clone chance)
        newWormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handlePurpleWormClick(cloneData);
        });

        // Clone birth effect
        parentWorm.element.classList.add('worm-multiply');
        newWormElement.classList.add('worm-multiply');

        setTimeout(() => {
            parentWorm.element.classList.remove('worm-multiply');
            newWormElement.classList.remove('worm-multiply');
        }, 500);

        console.log(`🟣 Purple worm cloned! New clone ${newWormId}. Total worms: ${this.worms.length}`);

        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    explodeWorm(worm, isRainKill = false, isChainReaction = false) {
        console.log(`💥 EXPLODING worm ${worm.id} (${isRainKill ? 'RAIN KILL' : 'direct click'}${isChainReaction ? ' - CHAIN REACTION' : ''}) and returning symbol "${worm.stolenSymbol}"!`);

        // AOE DAMAGE: Check for nearby worms and trigger chain explosions
        const AOE_RADIUS = 18; // One vertical worm height
        const nearbyWorms = this.worms.filter(w => {
            if (w.id === worm.id || !w.active) return false;
            const distance = calculateDistance(worm.x, worm.y, w.x, w.y);
            return distance <= AOE_RADIUS;
        });

        if (nearbyWorms.length > 0) {
            console.log(`💥 CHAIN REACTION! ${nearbyWorms.length} worms caught in blast radius!`);
            // Delay chain explosions slightly for visual effect
            setTimeout(() => {
                nearbyWorms.forEach(nearbyWorm => {
                    this.explodeWorm(nearbyWorm, false, true); // Chain explosion!
                });
            }, 150);
        }

        // Return stolen symbol to its original position
        if (worm.targetElement) {
            worm.targetElement.classList.remove('stolen', 'hidden-symbol');
            worm.targetElement.classList.add('revealed-symbol');
            worm.targetElement.style.visibility = 'visible';
            delete worm.targetElement.dataset.stolen;

            console.log(`✅ Symbol "${worm.stolenSymbol}" returned to Panel B`);
        }

        // DRAMATIC EXPLOSION EFFECT
        worm.element.classList.add('worm-exploding');

        // Create explosion particles
        this.createExplosionParticles(worm.x, worm.y);

        // Flash the screen
        this.createExplosionFlash();

        // Create persistent crack at worm's location
        this.createCrack(worm.x, worm.y);

        // Create slime splat that lasts 15 seconds
        this.createSlimeSplat(worm.x, worm.y);

        // Drop power-up if this worm has one (and not killed by chain reaction to avoid spam)
        if (worm.hasPowerUp && !isChainReaction) {
            if (this.powerUpSystem) {
                this.powerUpSystem.drop(worm.x, worm.y, worm.powerUpType);
            }
        }

        setTimeout(() => {
            this.removeWorm(worm);
        }, 500);
    }

    createExplosionParticles(x, y) {
        // Create 12 particle fragments flying outward
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';

            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            const distance = 80 + Math.random() * 40;

            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.setProperty('--angle-x', Math.cos(angle) * distance);
            particle.style.setProperty('--angle-y', Math.sin(angle) * distance);

            this.wormContainer.appendChild(particle);

            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 600);
        }
    }

    createExplosionFlash(color = null) {
        const flash = document.createElement('div');
        flash.className = 'explosion-flash';
        if (color) {
            flash.style.background = `radial-gradient(circle, ${color}66, transparent)`;
        }
        document.body.appendChild(flash);

        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 200);
    }

    // === POWER-UP METHODS REMOVED ===
    // All power-up logic has been extracted to js/worm-powerups.js
    // The following methods were removed (~470 lines):
    // - dropPowerUp()
    // - collectPowerUp()
    // - updatePowerUpDisplay()
    // - usePowerUp()
    // - activateChainLightning()
    // - activateSpider()
    // - spawnSpider()
    // - activateDevil()
    // - spawnDevil()

    createSlimeSplat(x, y) {
        const splat = document.createElement('div');
        splat.className = 'slime-splat';
        splat.style.left = `${x}px`;
        splat.style.top = `${y}px`;

        // Random rotation for variation
        splat.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;

        this.wormContainer.appendChild(splat);

        console.log(`🟢 Slime splat created at (${x}, ${y})`);

        // Fade out and remove after 15 seconds
        setTimeout(() => {
            splat.classList.add('slime-fading');
        }, 14000); // Start fade at 14s

        setTimeout(() => {
            if (splat.parentNode) {
                splat.parentNode.removeChild(splat);
            }
        }, 15000); // Remove at 15s
    }

    createCrack(x, y) {
        const crack = document.createElement('div');
        crack.className = 'worm-crack';
        crack.style.left = `${x}px`;
        crack.style.top = `${y}px`;

        // Append to panel C (third display)
        // PERFORMANCE: Use cached element
        const panelC = this.cachedPanelC || document.getElementById('third-display');
        if (panelC) {
            panelC.appendChild(crack);
            console.log(`💥 Crack created at (${x}, ${y})`);
        }
    }

    cleanupCracks() {
        // PERFORMANCE: Use cached element
        const panelC = this.cachedPanelC || document.getElementById('third-display');
        if (panelC) {
            const cracks = panelC.querySelectorAll('.worm-crack');
            cracks.forEach(crack => crack.remove());
            console.log(`🧹 Cleaned up ${cracks.length} crack(s)`);
        }
    }

    removeWorm(wormData) {
        const index = this.worms.indexOf(wormData);
        if (index > -1) {
            this.worms.splice(index, 1);
        }

        // Unlock console slot if worm was spawned from console
        if (wormData.fromConsole && wormData.consoleSlotIndex !== undefined) {
            this.lockedConsoleSlots.delete(wormData.consoleSlotIndex);
            if (wormData.consoleSlotElement) {
                wormData.consoleSlotElement.classList.remove('worm-spawning', 'locked');
            }
            console.log(`🔓 Console slot ${wormData.consoleSlotIndex + 1} unlocked`);
        }

        if (wormData.element && wormData.element.parentNode) {
            wormData.element.parentNode.removeChild(wormData.element);
        }

        console.log(`🐛 Worm ${wormData.id} removed. Active worms: ${this.worms.length}`);
    }

    killAllWorms() {
        console.log(`💀 KILLING ALL WORMS! Total worms to kill: ${this.worms.length}`);

        // Create a copy of the worms array to iterate over
        const wormsToKill = [...this.worms];

        // Explode each worm with a slight delay for dramatic effect
        wormsToKill.forEach((worm, index) => {
            setTimeout(() => {
                if (worm.active) {
                    console.log(`💥 Exploding worm ${worm.id}`);
                    this.explodeWorm(worm);
                }
            }, index * 100); // 100ms delay between each explosion
        });

        console.log(`✅ All worms scheduled for extermination!`);
    }

    reset() {
        console.log('🐛 Resetting worm system');

        // Clear spawn timer
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }

        // Reset spawn flag
        this.firstWormSpawned = false;

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove all worms
        this.worms.forEach(worm => {
            if (worm.element && worm.element.parentNode) {
                worm.element.parentNode.removeChild(worm.element);
            }
        });

        this.worms = [];

        // Clear stolen flags from symbols
        if (this.solutionContainer) {
            const stolenSymbols = this.solutionContainer.querySelectorAll('[data-stolen]');
            stolenSymbols.forEach(el => {
                el.style.visibility = 'visible';
                el.classList.remove('stolen');
                delete el.dataset.stolen;
            });
        }
    }
}

// Initialize global worm system
document.addEventListener('DOMContentLoaded', () => {
    window.wormSystem = new WormSystem();
    console.log('✅ Global wormSystem created');

    // CRITICAL: Initialize immediately to setup event listeners
    window.wormSystem.initialize();
    console.log('✅ WormSystem initialized - event listeners active');
});
