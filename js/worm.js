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

        // POWER-UP SYSTEM
        this.powerUps = {
            chainLightning: 0, // Number of chain lightning power-ups collected
            spider: 0,
            devil: 0
        };
        this.chainLightningKillCount = 5; // First use kills 5, then +2 per use

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

        // DISTANCE THRESHOLDS
        this.DISTANCE_STEAL_SYMBOL = 30; // px - how close to symbol to steal it
        this.DISTANCE_CONSOLE_ARRIVAL = 20; // px - how close to console to escape
        this.DISTANCE_TARGET_RUSH = 30; // px - when rushing to target symbol
        this.DISTANCE_ROAM_RESUME = 5; // px - lost target, resume roaming

        // EXPLOSION CONSTANTS
        this.EXPLOSION_AOE_RADIUS = 18; // px - one worm height for chain reactions
        this.EXPLOSION_PARTICLE_COUNT = 12; // number of particles per explosion

        // MOVEMENT CONSTANTS
        this.RUSH_SPEED_MULTIPLIER = 2.0; // 2x speed when rushing to target
        this.FLICKER_SPEED_BOOST = 1.2; // 20% speed boost when carrying symbol
        this.CRAWL_AMPLITUDE = 0.5; // inchworm effect amplitude
        this.DIRECTION_CHANGE_RATE = 0.1; // random direction change per frame
        this.CRAWL_PHASE_INCREMENT = 0.05; // crawl animation speed

        // SPAWN CONSTANTS
        this.WORM_SPAWN_OFFSET_RANGE = 60; // px - max offset when cloning
        this.CLONE_POSITION_OFFSET = 30; // px - purple worm clone offset

        // TIMING CONSTANTS
        this.ROAM_RESUME_DURATION = 5000; // ms - resume roaming after losing target
        this.CLONE_BIRTH_ANIMATION = 500; // ms - clone birth effect duration
        this.EXPLOSION_CHAIN_DELAY = 150; // ms - delay between chain explosions
        this.PURPLE_CLONE_ROAM_TIME = 8000; // ms - purple clone roaming time

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

    // Spawn worm from console slot with slide-open animation
    spawnWormFromConsole() {
        this.initialize();

        console.log(`🐛 spawnWormFromConsole() called. Current worms: ${this.worms.length}/${this.maxWorms}`);

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. No more spawning.`);
            return;
        }

        // Find empty console slot
        const slotData = this.findEmptyConsoleSlot();
        if (!slotData) {
            console.log('⚠️ All console slots occupied or locked, spawning worm normally');
            this.spawnWorm(); // Fallback to normal spawn
            return;
        }

        const { element: slotElement, index: slotIndex } = slotData;

        // Lock this console slot
        this.lockedConsoleSlots.add(slotIndex);
        slotElement.classList.add('worm-spawning', 'locked');

        console.log(`🕳️ Worm spawning from console slot ${slotIndex + 1}`);

        // Get slot position for worm spawn point (viewport coordinates)
        const slotRect = slotElement.getBoundingClientRect();
        const startX = slotRect.left + (slotRect.width / 2);
        const startY = slotRect.top + (slotRect.height / 2);

        // REFACTORED: Use factory method for worm creation
        const wormId = generateUniqueId('worm');
        const wormElement = this.createWormElement({
            id: wormId,
            classNames: ['console-worm'],
            segmentCount: this.WORM_SEGMENT_COUNT,
            x: startX,
            y: startY
        });

        this.crossPanelContainer.appendChild(wormElement);

        // POWER-UP: 10% chance to carry a power-up
        const hasPowerUp = Math.random() < this.POWER_UP_DROP_RATE;
        const powerUpType = hasPowerUp ? this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)] : null;

        // Store worm data with console slot reference
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * this.SPEED_CONSOLE_WORM,
            velocityY: (Math.random() - 0.5) * 1.0,
            active: true,
            hasStolen: false,
            isRushingToTarget: false,
            roamingEndTime: Date.now() + this.difficultyRoamTimeConsole, // Use difficulty-scaled roam time
            isFlickering: false,
            baseSpeed: this.SPEED_CONSOLE_WORM,
            currentSpeed: this.SPEED_CONSOLE_WORM,
            consoleSlotIndex: slotIndex,
            consoleSlotElement: slotElement,
            fromConsole: true,
            crawlPhase: 0,
            direction: Math.random() * Math.PI * 2,
            hasPowerUp: hasPowerUp,
            powerUpType: powerUpType
        };

        if (hasPowerUp) {
            console.log(`✨ Worm ${wormId} has power-up: ${powerUpType}`);
        }

        this.worms.push(wormData);

        // Add click handler
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleWormClick(wormData);
        });

        console.log(`✅ Worm ${wormId} spawned at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);
        console.log(`🐛 Worm will roam for 10 seconds before stealing`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    // Fallback spawn method for when console slots are all occupied
    spawnWorm() {
        this.initialize();

        console.log(`🐛 spawnWorm() called (fallback). Current worms: ${this.worms.length}/${this.maxWorms}`);

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. No more spawning.`);
            return;
        }

        // Random starting position at bottom - USE VIEWPORT COORDINATES
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const startX = Math.random() * Math.max(0, viewportWidth - 80);
        const startY = Math.max(0, viewportHeight - 30);

        // REFACTORED: Use factory method for worm creation
        const wormId = generateUniqueId('worm');
        const wormElement = this.createWormElement({
            id: wormId,
            classNames: [],
            segmentCount: this.WORM_SEGMENT_COUNT,
            x: startX,
            y: startY
        });

        this.crossPanelContainer.appendChild(wormElement);

        // POWER-UP: 10% chance to carry a power-up
        const hasPowerUp = Math.random() < this.POWER_UP_DROP_RATE;
        const powerUpType = hasPowerUp ? this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)] : null;

        // Store worm data (non-console worm)
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * this.SPEED_FALLBACK_WORM,
            velocityY: (Math.random() - 0.5) * 0.5,
            active: true,
            hasStolen: false,
            roamingEndTime: Date.now() + this.difficultyRoamTimeConsole, // Use difficulty-scaled roam time
            isFlickering: false,
            baseSpeed: this.SPEED_FALLBACK_WORM,
            currentSpeed: this.SPEED_FALLBACK_WORM,
            fromConsole: false,
            hasPowerUp: hasPowerUp,
            powerUpType: powerUpType
        };

        if (hasPowerUp) {
            console.log(`✨ Worm ${wormId} has power-up: ${powerUpType}`);
        }

        this.worms.push(wormData);

        // Add click handler
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleWormClick(wormData);
        });

        console.log(`✅ Worm ${wormId} spawned (fallback mode). Total worms: ${this.worms.length}`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    // Spawn worm from border (bottom or sides) - used for row completion
    spawnWormFromBorder(data = {}) {
        this.initialize();

        const { index = 0, total = 1 } = data;
        console.log(`🐛 spawnWormFromBorder() called. Worm ${index + 1}/${total}. Current worms: ${this.worms.length}/${this.maxWorms}`);

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. No more spawning.`);
            return;
        }

        // Determine spawn position (spread around bottom and side borders)
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = this.BORDER_MARGIN;
        const position = index / total; // 0 to 1

        let startX, startY;

        if (position < 0.5) {
            // Bottom border (0-50%)
            const xPosition = position * 2;
            startX = margin + xPosition * (viewportWidth - 2 * margin);
            startY = viewportHeight - margin;
        } else if (position < 0.75) {
            // Left border (50-75%)
            const yPosition = (position - 0.5) * 4;
            startX = margin;
            startY = margin + yPosition * (viewportHeight - 2 * margin);
        } else {
            // Right border (75-100%)
            const yPosition = (position - 0.75) * 4;
            startX = viewportWidth - margin;
            startY = margin + yPosition * (viewportHeight - 2 * margin);
        }

        // REFACTORED: Use factory method for worm creation
        const wormId = generateUniqueId('border-worm');
        const wormElement = this.createWormElement({
            id: wormId,
            classNames: [],
            segmentCount: this.WORM_SEGMENT_COUNT,
            x: startX,
            y: startY
        });

        this.crossPanelContainer.appendChild(wormElement);

        // Store worm data
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * this.SPEED_BORDER_WORM,
            velocityY: (Math.random() - 0.5) * 1.0,
            active: true,
            hasStolen: false,
            isRushingToTarget: false,
            roamingEndTime: Date.now() + this.difficultyRoamTimeBorder, // Use difficulty-scaled roam time
            isFlickering: false,
            baseSpeed: this.SPEED_BORDER_WORM,
            currentSpeed: this.SPEED_BORDER_WORM,
            fromConsole: false,
            shouldExitToConsole: true,
            exitingToConsole: false,
            targetConsoleSlot: null,
            crawlPhase: Math.random() * Math.PI * 2,
            direction: Math.random() * Math.PI * 2
        };

        // POWER-UP: 10% chance to carry a power-up
        const hasPowerUp = Math.random() < this.POWER_UP_DROP_RATE;
        const powerUpType = hasPowerUp ? this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)] : null;
        wormData.hasPowerUp = hasPowerUp;
        wormData.powerUpType = powerUpType;

        if (hasPowerUp) {
            console.log(`✨ Border worm ${wormId} has power-up: ${powerUpType}`);
        }

        this.worms.push(wormData);

        // Add click handler
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleWormClick(wormData);
        });

        console.log(`✅ Border worm ${wormId} spawned at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    // PURPLE WORM: Spawn purple worm triggered by 2+ wrong answers
    spawnPurpleWorm() {
        this.initialize();

        console.log(`🟣 spawnPurpleWorm() called. Current worms: ${this.worms.length}/${this.maxWorms}`);

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot spawn purple worm.`);
            return;
        }

        // Spawn from help button position - USE VIEWPORT COORDINATES
        // PERFORMANCE: Use cached element instead of getElementById
        const helpButton = this.cachedHelpButton || document.getElementById('help-button');
        let startX, startY;

        if (helpButton) {
            const helpRect = helpButton.getBoundingClientRect();
            startX = helpRect.left + (helpRect.width / 2);
            startY = helpRect.top + (helpRect.height / 2);
            console.log(`🟣 Purple worm spawning from help button at (${startX.toFixed(0)}, ${startY.toFixed(0)})`);
        } else {
            // Fallback if help button not found
            const viewportWidth = window.innerWidth;
            startX = Math.random() * Math.max(0, viewportWidth - 80);
            startY = -50; // Start above viewport
            console.log(`⚠️ Help button not found, using fallback position`);
        }

        // REFACTORED: Use factory method for worm creation
        const wormId = generateUniqueId('purple-worm');
        const wormElement = this.createWormElement({
            id: wormId,
            classNames: ['purple-worm'],
            segmentCount: this.WORM_SEGMENT_COUNT,
            x: startX,
            y: startY
        });

        this.crossPanelContainer.appendChild(wormElement);

        // Store purple worm data
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * this.SPEED_PURPLE_WORM,
            velocityY: Math.random() * 0.75 + 0.5,
            active: true,
            hasStolen: false,
            isRushingToTarget: true,
            roamingEndTime: Date.now(),
            isFlickering: false,
            baseSpeed: this.SPEED_PURPLE_WORM,
            currentSpeed: this.SPEED_PURPLE_WORM,
            isPurple: true,
            fromConsole: false,
            shouldExitToConsole: true,
            exitingToConsole: false,
            targetConsoleSlot: null,
            crawlPhase: 0,
            direction: Math.random() * Math.PI * 2,
            canStealBlue: true,
            prioritizeRed: true
        };

        // POWER-UP: 10% chance to carry a power-up (even purple worms)
        const hasPowerUp = Math.random() < this.POWER_UP_DROP_RATE;
        const powerUpType = hasPowerUp ? this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)] : null;
        wormData.hasPowerUp = hasPowerUp;
        wormData.powerUpType = powerUpType;

        if (hasPowerUp) {
            console.log(`✨ Purple worm ${wormId} has power-up: ${powerUpType}`);
        }

        this.worms.push(wormData);

        // PURPLE WORM CLICK: Always clones
        wormData.clickHandler = (e) => {
            e.stopPropagation();
            this.handlePurpleWormClick(wormData);
        };
        wormElement.addEventListener('click', wormData.clickHandler);

        console.log(`🟣 Purple worm ${wormId} spawned from help button at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);
        console.log(`🟣 Purple worm moves at HALF SPEED, prioritizes RED symbols, and CLONES on click!`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
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
        worm.currentSpeed = worm.baseSpeed * this.FLICKER_SPEED_BOOST; // 20% speed boost!

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

    // ========================================
    // MOVEMENT UTILITIES (Phase 2 Refactoring)
    // ========================================

    /**
     * Calculate velocity toward target position
     * @private
     */
    _calculateVelocityToTarget(worm, targetX, targetY, speedMultiplier = 1) {
        const distance = calculateDistance(worm.x, worm.y, targetX, targetY);
        const dx = targetX - worm.x;
        const dy = targetY - worm.y;

        const speed = worm.baseSpeed * speedMultiplier;

        return {
            velocityX: (dx / distance) * speed,
            velocityY: (dy / distance) * speed,
            distance: distance,
            direction: Math.atan2(dy, dx)
        };
    }

    /**
     * Apply boundary constraints to worm position
     * @private
     */
    _constrainToBounds(worm, bounds) {
        const { width, height, margin = this.BORDER_MARGIN } = bounds;

        if (worm.x < margin) {
            worm.x = margin;
            worm.direction = Math.PI - worm.direction;
        }
        if (worm.x > width - margin) {
            worm.x = width - margin;
            worm.direction = Math.PI - worm.direction;
        }
        if (worm.y < margin) {
            worm.y = margin;
            worm.direction = -worm.direction;
        }
        if (worm.y > height - margin) {
            worm.y = height - margin;
            worm.direction = -worm.direction;
        }
    }

    /**
     * Update worm rotation to face movement direction
     * @private
     */
    _updateWormRotation(worm) {
        // Add π (180°) to flip worm so head faces forward
        worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
    }

    /**
     * Apply crawling movement with inchworm effect
     * @private
     */
    _applyCrawlMovement(worm) {
        worm.direction += (Math.random() - 0.5) * this.DIRECTION_CHANGE_RATE;
        const crawlOffset = Math.sin(worm.crawlPhase) * this.CRAWL_AMPLITUDE;

        worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
        worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
    }

    /**
     * Apply worm position to DOM element
     * @private
     */
    _applyWormPosition(worm) {
        worm.element.style.left = `${worm.x}px`;
        worm.element.style.top = `${worm.y}px`;
    }

    animate() {
        if (this.worms.length === 0) {
            this.animationFrameId = null;
            return;
        }

        const currentTime = Date.now();

        // CROSS-PANEL MOVEMENT: Use viewport dimensions instead of Panel B only
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // PERFORMANCE: Get Panel B boundaries once per frame, use cached rect
        const panelBRect = this.getCachedContainerRect();

        this.worms.forEach(worm => {
            if (!worm.active) return;

            // Update crawl phase for animation
            worm.crawlPhase = (worm.crawlPhase + this.CRAWL_PHASE_INCREMENT) % (Math.PI * 2);

            // DEVIL POWER-UP: Override all behavior if rushing to devil
            if (worm.isRushingToDevil && worm.devilX !== undefined && worm.devilY !== undefined) {
                const distance = calculateDistance(worm.x, worm.y, worm.devilX, worm.devilY);
                const dx = worm.devilX - worm.x;
                const dy = worm.devilY - worm.y;

                if (distance > 5) {
                    // Rush toward devil at double speed
                    const rushSpeed = worm.baseSpeed * 2;
                    worm.velocityX = (dx / distance) * rushSpeed;
                    worm.velocityY = (dy / distance) * rushSpeed;

                    worm.x += worm.velocityX;
                    worm.y += worm.velocityY;

                    // Rotate towards devil
                    worm.element.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI}rad)`;
                }

                // Apply position
                worm.element.style.left = `${worm.x}px`;
                worm.element.style.top = `${worm.y}px`;
                return; // Skip normal behavior
            }

            // Check if roaming period has ended and worm should steal
            if (!worm.hasStolen && !worm.isRushingToTarget && currentTime >= worm.roamingEndTime) {
                this.stealSymbol(worm);
            }

            // Rushing to red symbol that just appeared
            if (worm.isRushingToTarget && !worm.hasStolen) {
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

                    if (distance < this.DISTANCE_STEAL_SYMBOL) {
                        // Reached target - steal it!
                        this.stealSymbol(worm);
                    } else {
                        // Move towards target at double speed
                        const rushSpeed = worm.baseSpeed * this.RUSH_SPEED_MULTIPLIER;
                        worm.velocityX = (dx / distance) * rushSpeed;
                        worm.velocityY = (dy / distance) * rushSpeed;

                        worm.x += worm.velocityX;
                        worm.y += worm.velocityY;
                    }
                } else {
                    // Target disappeared, go back to roaming
                    console.log(`🐛 Worm ${worm.id} lost target, resuming roaming`);
                    worm.isRushingToTarget = false;
                    worm.roamingEndTime = Date.now() + this.ROAM_RESUME_DURATION;
                }
            }
            // Roaming behavior - crawling movement ACROSS ALL PANELS
            else if (!worm.hasStolen && !worm.isRushingToTarget) {
                this._applyCrawlMovement(worm);
                this._constrainToBounds(worm, {
                    width: viewportWidth,
                    height: viewportHeight
                });
                this._updateWormRotation(worm);
            }
            // Carrying symbol - return to console hole
            else if (worm.hasStolen && worm.fromConsole && worm.consoleSlotElement) {
                const slotRect = worm.consoleSlotElement.getBoundingClientRect();
                const targetX = slotRect.left + (slotRect.width / 2);
                const targetY = slotRect.top + (slotRect.height / 2);

                const velocity = this._calculateVelocityToTarget(worm, targetX, targetY, 1.0);

                if (velocity.distance < this.DISTANCE_CONSOLE_ARRIVAL) {
                    // Reached console hole - escape with symbol!
                    console.log(`🐛 Worm ${worm.id} escaped to console with symbol "${worm.stolenSymbol}"!`);
                    console.log(`💀 Symbol "${worm.stolenSymbol}" stays HIDDEN until user clicks it again in Panel C`);
                    this.removeWorm(worm);
                    return;
                }

                // Move towards console with LSD colors!
                worm.direction = velocity.direction;
                worm.velocityX = velocity.velocityX;
                worm.velocityY = velocity.velocityY;
                worm.x += worm.velocityX;
                worm.y += worm.velocityY;
                this._updateWormRotation(worm);
            }
            // Carrying symbol but not from console - just roam with it
            else if (worm.hasStolen && !worm.fromConsole) {
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
                        const targetX = slotRect.left + (slotRect.width / 2);
                        const targetY = slotRect.top + (slotRect.height / 2);

                        const velocity = this._calculateVelocityToTarget(worm, targetX, targetY, 1.0);

                        if (velocity.distance < this.DISTANCE_CONSOLE_ARRIVAL) {
                            // Reached console exit - purple worm escapes!
                            console.log(`🟣 Purple worm ${worm.id} exited through console!`);
                            this.removeWorm(worm);
                            return;
                        }

                        // Move towards console exit
                        worm.direction = velocity.direction;
                        worm.velocityX = velocity.velocityX;
                        worm.velocityY = velocity.velocityY;
                        worm.x += worm.velocityX;
                        worm.y += worm.velocityY;
                        this._updateWormRotation(worm);
                    } else {
                        // No console slot found yet, continue roaming
                        this._applyCrawlMovement(worm);
                    }
                } else {
                    // Normal worm carrying symbol - continue roaming
                    this._applyCrawlMovement(worm);
                }

                // Note: Panel B boundaries would be applied here if needed (currently unreachable code)
                this._updateWormRotation(worm);
            }

            // Apply position directly (no CSS transitions for smooth crawling)
            this._applyWormPosition(worm);
        });

        // Continue animation if there are active worms
        if (this.worms.some(w => w.active)) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationFrameId = null;
        }
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

    // PURPLE WORM: Clone purple worm (maintains purple properties)
    /**
     * Clone a purple worm - creates another purple worm as punishment for clicking
     * This is the ONLY cloning mechanic remaining (cloning curse removed Oct 2025)
     * Purple worms can only be killed by clicking matching symbol in Panel C rain.
     */
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
        const offset = this.CLONE_POSITION_OFFSET;
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
            roamingEndTime: Date.now() + this.PURPLE_CLONE_ROAM_TIME,
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
        }, this.CLONE_BIRTH_ANIMATION);

        console.log(`🟣 Purple worm cloned! New clone ${newWormId}. Total worms: ${this.worms.length}`);

        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    explodeWorm(worm, isRainKill = false, isChainReaction = false) {
        console.log(`💥 EXPLODING worm ${worm.id} (${isRainKill ? 'RAIN KILL' : 'direct click'}${isChainReaction ? ' - CHAIN REACTION' : ''}) and returning symbol "${worm.stolenSymbol}"!`);

        // AOE DAMAGE: Check for nearby worms and trigger chain explosions
        const nearbyWorms = this.worms.filter(w => {
            if (w.id === worm.id || !w.active) return false;
            const distance = calculateDistance(worm.x, worm.y, w.x, w.y);
            return distance <= this.EXPLOSION_AOE_RADIUS;
        });

        if (nearbyWorms.length > 0) {
            console.log(`💥 CHAIN REACTION! ${nearbyWorms.length} worms caught in blast radius!`);
            // Delay chain explosions slightly for visual effect
            setTimeout(() => {
                nearbyWorms.forEach(nearbyWorm => {
                    this.explodeWorm(nearbyWorm, false, true); // Chain explosion!
                });
            }, this.EXPLOSION_CHAIN_DELAY);
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
            this.dropPowerUp(worm.x, worm.y, worm.powerUpType);
        }

        setTimeout(() => {
            this.removeWorm(worm);
        }, 500);
    }

    createExplosionParticles(x, y) {
        // Create particle fragments flying outward
        for (let i = 0; i < this.EXPLOSION_PARTICLE_COUNT; i++) {
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

    // Drop power-up at worm location
    dropPowerUp(x, y, type = null) {
        // Random power-up type if not specified
        if (!type) {
            const types = ['chainLightning', 'spider', 'devil'];
            type = types[Math.floor(Math.random() * types.length)];
        }

        const powerUp = document.createElement('div');
        powerUp.className = 'power-up';
        powerUp.dataset.type = type;

        // Set emoji based on type
        const emojis = {
            chainLightning: '⚡',
            spider: '🕷️',
            devil: '👹'
        };
        powerUp.textContent = emojis[type] || '⭐';

        powerUp.style.left = `${x}px`;
        powerUp.style.top = `${y}px`;
        powerUp.style.position = 'fixed';
        powerUp.style.fontSize = '30px';
        powerUp.style.zIndex = '10001';
        powerUp.style.cursor = 'pointer';
        powerUp.style.animation = 'power-up-appear 0.5s ease-out';
        powerUp.style.pointerEvents = 'auto';

        // Click to collect
        powerUp.addEventListener('click', (e) => {
            e.stopPropagation();
            this.collectPowerUp(type, powerUp);
        });

        this.crossPanelContainer.appendChild(powerUp);
        console.log(`✨ Power-up "${type}" dropped at (${x.toFixed(0)}, ${y.toFixed(0)})`);

        // Auto-remove after 10 seconds if not collected
        setTimeout(() => {
            if (powerUp.parentNode) {
                powerUp.style.animation = 'power-up-fade 0.5s ease-out';
                setTimeout(() => {
                    if (powerUp.parentNode) {
                        powerUp.parentNode.removeChild(powerUp);
                    }
                }, this.WORM_REMOVAL_DELAY);
            }
        }, this.SLIME_SPLAT_DURATION);
    }

    // Collect power-up
    collectPowerUp(type, element) {
        this.powerUps[type]++;
        console.log(`🎁 Collected ${type} power-up! Total: ${this.powerUps[type]}`);

        // Chain Lightning: Increase kill count with each pickup
        if (type === 'chainLightning') {
            // Only increase after first pickup
            if (this.powerUps[type] > 1) {
                this.chainLightningKillCount += 2;
                console.log(`⚡ Chain Lightning kill count increased to ${this.chainLightningKillCount}`);
            }
        }

        // Visual feedback
        element.style.animation = 'power-up-collect 0.3s ease-out';

        // Update console display (will be implemented)
        this.updatePowerUpDisplay();

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }

    // Update power-up display on console
    updatePowerUpDisplay() {
        console.log(`📊 Power-ups: ⚡${this.powerUps.chainLightning} 🕷️${this.powerUps.spider} 👹${this.powerUps.devil}`);

        // PERFORMANCE: Use cached elements
        let powerUpDisplay = this.cachedPowerUpDisplay || document.getElementById('power-up-display');
        const consoleElement = this.consoleElement || document.getElementById('symbol-console');

        if (!powerUpDisplay) {
            powerUpDisplay = document.createElement('div');
            powerUpDisplay.id = 'power-up-display';
            powerUpDisplay.style.cssText = `
                position: relative;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px;
                border-radius: 8px;
                font-family: 'Orbitron', monospace;
                font-size: 16px;
                z-index: 10002;
                display: flex;
                justify-content: center;
                gap: 12px;
                border: 2px solid #0f0;
                margin-top: 8px;
                box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
            `;

            // Insert power-up display directly after the console element
            if (consoleElement && consoleElement.parentNode) {
                consoleElement.parentNode.insertBefore(powerUpDisplay, consoleElement.nextSibling);
            } else {
                // Fallback to body if console not found
                document.body.appendChild(powerUpDisplay);
            }

            this.cachedPowerUpDisplay = powerUpDisplay; // Cache the newly created display
        }

        powerUpDisplay.innerHTML = `
            <div class="power-up-item" data-type="chainLightning" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s; position: relative;">
                ⚡ ${this.powerUps.chainLightning}
                ${this.powerUps.chainLightning > 0 ? `<div style="position: absolute; top: -10px; right: -10px; font-size: 12px; color: #0ff;">${this.chainLightningKillCount}</div>` : ''}
            </div>
            <div class="power-up-item" data-type="spider" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                🕷️ ${this.powerUps.spider}
            </div>
            <div class="power-up-item" data-type="devil" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                👹 ${this.powerUps.devil}
            </div>
        `;

        // Add click handlers
        powerUpDisplay.querySelectorAll('.power-up-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(0, 255, 0, 0.3)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                this.usePowerUp(type);
            });
        });
    }

    // Use a power-up
    usePowerUp(type) {
        if (this.powerUps[type] <= 0) {
            console.log(`⚠️ No ${type} power-ups available!`);
            return;
        }

        console.log(`🎮 Using ${type} power-up!`);
        this.powerUps[type]--;

        if (type === 'chainLightning') {
            this.activateChainLightning();
        } else if (type === 'spider') {
            this.activateSpider();
        } else if (type === 'devil') {
            this.activateDevil();
        }

        this.updatePowerUpDisplay();
    }

    // Chain Lightning: Click worm to kill 5 + nearby worms
    activateChainLightning() {
        console.log(`⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash the power!`);

        // Calculate kill count (5 for first use, then +2 for each subsequent use)
        const killCount = this.chainLightningKillCount;
        console.log(`⚡ Will kill ${killCount} worms in proximity`);

        // Set up one-time click listener on worms
        const handleWormClickForLightning = (e, worm) => {
            e.stopPropagation();
            console.log(`⚡ Chain Lightning targeting worm ${worm.id}!`);

            // Find closest worms
            const sortedWorms = this.worms
                .filter(w => w.active)
                .sort((a, b) => {
                    const distA = Math.sqrt(Math.pow(a.x - worm.x, 2) + Math.pow(a.y - worm.y, 2));
                    const distB = Math.sqrt(Math.pow(b.x - worm.x, 2) + Math.pow(b.y - worm.y, 2));
                    return distA - distB;
                })
                .slice(0, killCount);

            console.log(`⚡ Killing ${sortedWorms.length} worms with chain lightning!`);

            // Visual effect
            sortedWorms.forEach((targetWorm, index) => {
                setTimeout(() => {
                    // Lightning bolt effect
                    const bolt = document.createElement('div');
                    bolt.style.cssText = `
                        position: fixed;
                        left: ${worm.x}px;
                        top: ${worm.y}px;
                        width: 3px;
                        height: ${Math.sqrt(Math.pow(targetWorm.x - worm.x, 2) + Math.pow(targetWorm.y - worm.y, 2))}px;
                        background: linear-gradient(180deg, #fff, #0ff, #fff);
                        transform-origin: top left;
                        transform: rotate(${Math.atan2(targetWorm.y - worm.y, targetWorm.x - worm.x) + Math.PI / 2}rad);
                        z-index: 10003;
                        box-shadow: 0 0 10px #0ff, 0 0 20px #0ff;
                        pointer-events: none;
                    `;
                    document.body.appendChild(bolt);

                    setTimeout(() => {
                        if (bolt.parentNode) bolt.parentNode.removeChild(bolt);
                    }, 200);

                    // Explode worm
                    this.explodeWorm(targetWorm, false);
                }, index * 100);
            });

            // RESET: Count resets when used (back to 5 for next collection)
            this.chainLightningKillCount = 5;

            // Remove temporary listeners
            this.worms.forEach(w => {
                if (w.element && w.tempLightningHandler) {
                    w.element.removeEventListener('click', w.tempLightningHandler);
                    delete w.tempLightningHandler;
                }
            });

            // Reset cursor
            document.body.style.cursor = '';
        };

        // Add temporary click listeners to all worms
        this.worms.forEach(w => {
            if (w.active && w.element) {
                w.tempLightningHandler = (e) => handleWormClickForLightning(e, w);
                w.element.addEventListener('click', w.tempLightningHandler);
            }
        });

        // Change cursor to indicate power-up is active
        document.body.style.cursor = 'crosshair';
    }

    // Spider: Spawns spider that converts worms to spiders, which convert more worms
    activateSpider() {
        console.log(`🕷️ SPIDER ACTIVATED! Spawning conversion spider...`);

        // Find closest worm
        const activeWorms = this.worms.filter(w => w.active);
        if (activeWorms.length === 0) {
            console.log(`⚠️ No worms to convert!`);
            return;
        }

        // Spawn spider at random location
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
            createdAt: Date.now(),
            isHeart: false
        };

        // Click to turn into heart
        spider.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!spiderData.isHeart) {
                spider.textContent = '❤️';
                spiderData.isHeart = true;
                console.log(`🕷️ Spider clicked - turned into ❤️!`);

                // After 1 minute, turn to skull
                setTimeout(() => {
                    if (spider.parentNode) {
                        spider.textContent = '💀';
                        setTimeout(() => {
                            if (spider.parentNode) {
                                spider.parentNode.removeChild(spider);
                            }
                        }, this.SKULL_DISPLAY_DURATION); // Remove after 10 seconds
                    }
                }, this.SPIDER_HEART_DURATION);
            }
        });

        this.crossPanelContainer.appendChild(spider);

        // Move spider toward closest worm
        const moveSpider = () => {
            if (!spiderData.active || spiderData.isHeart) return;

            const activeWorms = this.worms.filter(w => w.active);
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

            // Move toward closest worm
            const dist = calculateDistance(spiderData.x, spiderData.y, closest.x, closest.y);
            const dx = closest.x - spiderData.x;
            const dy = closest.y - spiderData.y;

            if (dist < 30) {
                // Convert worm to spider!
                console.log(`🕷️ Spider converted worm ${closest.id} to another spider!`);
                this.removeWorm(closest);
                this.spawnSpider(closest.x, closest.y);

                // Remove this spider
                if (spider.parentNode) {
                    spider.parentNode.removeChild(spider);
                }
                spiderData.active = false;
            } else {
                // Move toward worm
                const speed = 5;
                spiderData.x += (dx / dist) * speed;
                spiderData.y += (dy / dist) * speed;
                spider.style.left = `${spiderData.x}px`;
                spider.style.top = `${spiderData.y}px`;

                requestAnimationFrame(moveSpider);
            }
        };

        moveSpider();
    }

    // Devil: Click location to spawn devil, worms rush to it and die after 5s proximity
    activateDevil() {
        console.log(`👹 DEVIL ACTIVATED! Click location to spawn devil...`);

        // One-time click listener
        const handleDevilClick = (e) => {
            const x = e.clientX;
            const y = e.clientY;

            console.log(`👹 Devil spawning at (${x}, ${y})`);

            this.spawnDevil(x, y);

            // Remove listener and reset cursor
            document.removeEventListener('click', handleDevilClick);
            document.body.style.cursor = '';
        };

        document.addEventListener('click', handleDevilClick);
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
            animation: devil-pulsate 1.5s ease-in-out infinite;
        `;

        this.crossPanelContainer.appendChild(devil);

        // Track worms near devil
        const devilData = {
            x: x,
            y: y,
            wormProximity: new Map() // Track how long each worm has been near
        };

        const checkProximity = () => {
            const activeWorms = this.worms.filter(w => w.active);

            activeWorms.forEach(worm => {
                const dist = Math.sqrt(Math.pow(worm.x - devilData.x, 2) + Math.pow(worm.y - devilData.y, 2));

                if (dist < this.DEVIL_PROXIMITY_DISTANCE) {
                    // Worm is near devil
                    if (!devilData.wormProximity.has(worm.id)) {
                        devilData.wormProximity.set(worm.id, Date.now());
                    } else {
                        const timeNear = Date.now() - devilData.wormProximity.get(worm.id);
                        if (timeNear >= this.DEVIL_KILL_TIME) {
                            // Worm has been near for 5 seconds - kill it!
                            console.log(`👹 Worm ${worm.id} killed by devil (5s proximity)`);

                            // Create skull emoji
                            const skull = document.createElement('div');
                            skull.textContent = '💀';
                            skull.style.cssText = `
                                position: fixed;
                                left: ${worm.x}px;
                                top: ${worm.y}px;
                                font-size: 30px;
                                z-index: 10002;
                                pointer-events: none;
                            `;
                            this.crossPanelContainer.appendChild(skull);

                            setTimeout(() => {
                                if (skull.parentNode) {
                                    skull.parentNode.removeChild(skull);
                                }
                            }, this.SKULL_DISPLAY_DURATION);

                            this.explodeWorm(worm, false);
                            devilData.wormProximity.delete(worm.id);
                        }
                    }

                    // Make worm rush toward devil (override normal behavior)
                    worm.isRushingToDevil = true;
                    worm.devilX = devilData.x;
                    worm.devilY = devilData.y;
                } else {
                    // Worm left proximity
                    if (devilData.wormProximity.has(worm.id)) {
                        devilData.wormProximity.delete(worm.id);
                    }
                    worm.isRushingToDevil = false;
                }
            });

            if (activeWorms.length > 0) {
                requestAnimationFrame(checkProximity);
            } else {
                // No more worms, remove devil
                if (devil.parentNode) {
                    devil.parentNode.removeChild(devil);
                }
            }
        };

        checkProximity();
    }

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
