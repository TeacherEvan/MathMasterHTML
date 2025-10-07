// js/worm.js - Enhanced Worm System with Crawling Behavior
console.log("🐛 Worm System Loading...");

class WormSystem {
    constructor() {
        this.worms = [];
        this.maxWorms = 7; // Maximum 7 worms on play field
        this.wormContainer = null;
        this.solutionContainer = null;
        this.consoleElement = null;
        this.isInitialized = false;
        this.animationFrameId = null;
        this.spawnTimer = null;
        this.firstWormSpawned = false;
        this.lockedConsoleSlots = new Set(); // Track which console slots have active worms

        // CLONING CURSE MECHANIC
        this.cloningCurseActive = false; // Tracks if cloning curse is active
        this.wormsKilledByRain = 0; // Count of worms killed via rain symbols (not direct clicks)
        this.stolenBlueSymbols = []; // Track stolen blue symbols for replacement priority

        // PERFORMANCE: DOM query caching
        this.cachedRevealedSymbols = null;
        this.revealedSymbolsCacheTime = 0;
        this.cachedContainerRect = null;
        this.containerRectCacheTime = 0;
        this.CACHE_DURATION_TARGETS = 100; // Refresh revealed symbols every 100ms
        this.CACHE_DURATION_RECT = 200; // Refresh container rect every 200ms

        console.log('🐛 WormSystem initialized with DOM query caching and Cloning Curse mechanic');

        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', (event) => {
            console.log('🐛 Worm System received problemLineCompleted event:', event.detail);
            this.spawnWormFromConsole();
        });

        // PURPLE WORM: Listen for purple worm trigger (2+ wrong answers)
        document.addEventListener('purpleWormTriggered', (event) => {
            console.log('🟣 Purple Worm System received purpleWormTriggered event:', event.detail);
            this.spawnPurpleWorm();
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

    // Check if rain symbol clicked matches worm's stolen symbol - EXPLODE WORM!
    checkWormTargetClickForExplosion(clickedSymbol) {
        // Normalize X/x
        const normalizedClicked = clickedSymbol.toLowerCase() === 'x' ? 'X' : clickedSymbol;

        // Check if any worm is carrying this symbol
        this.worms.forEach(worm => {
            if (!worm.active || !worm.hasStolen) return;

            const normalizedWormSymbol = worm.stolenSymbol.toLowerCase() === 'x' ? 'X' : worm.stolenSymbol;

            if (normalizedWormSymbol === normalizedClicked) {
                console.log(`💥 BOOM! User clicked rain symbol "${clickedSymbol}" - EXPLODING worm with stolen symbol!`);

                // Track this as a rain kill (not direct click)
                this.wormsKilledByRain++;
                console.log(`📊 Worms killed by rain: ${this.wormsKilledByRain}`);

                this.explodeWorm(worm, true); // Pass true to indicate this is a rain kill

                // Check if curse should be reset (all visible worms killed by rain)
                this.checkCurseReset();
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

    // Check if cloning curse should be reset (all worms eliminated via rain)
    checkCurseReset() {
        if (!this.cloningCurseActive) return;

        const activeWorms = this.worms.filter(w => w.active);

        if (activeWorms.length === 0) {
            console.log('🔓 CURSE RESET! All worms eliminated via rain symbols!');
            this.cloningCurseActive = false;
            this.wormsKilledByRain = 0;
            this.stolenBlueSymbols = []; // Clear stolen blue symbols tracking

            // Visual feedback for curse reset
            this.createCurseResetEffect();
        } else {
            console.log(`🔒 Curse still active. ${activeWorms.length} worm(s) remaining.`);
        }
    }

    // Visual effect when curse is reset
    createCurseResetEffect() {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100vw';
        flash.style.height = '100vh';
        flash.style.background = 'radial-gradient(circle, rgba(0,255,255,0.3), transparent)';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '999999';
        flash.style.animation = 'curse-reset-flash 1s ease-out';

        document.body.appendChild(flash);

        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 1000);
    }

    initialize() {
        if (this.isInitialized) return;

        this.wormContainer = document.getElementById('worm-container');
        this.solutionContainer = document.getElementById('solution-container');
        this.consoleElement = document.getElementById('symbol-console');

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

        // Get slot position for worm spawn point
        const slotRect = slotElement.getBoundingClientRect();
        const containerRect = this.getCachedContainerRect(); // PERFORMANCE: Use cached rect

        // Calculate spawn position relative to panel-b
        const startX = slotRect.left - containerRect.left + (slotRect.width / 2);
        const startY = slotRect.top - containerRect.top + (slotRect.height / 2);

        // Create worm element
        const wormId = `worm-${Date.now()}-${Math.random()}`;
        const wormElement = document.createElement('div');
        wormElement.className = 'worm-container console-worm';
        wormElement.id = wormId;

        // Worm body with segments (quarter-coin size ~24px)
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        // 5 segments for quarter-sized worm
        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        wormElement.appendChild(wormBody);

        // Position worm at console slot
        wormElement.style.left = `${startX}px`;
        wormElement.style.top = `${startY}px`;
        wormElement.style.position = 'absolute';
        wormElement.style.zIndex = '10000'; // MAXIMUM z-index - in front of ALL layers
        wormElement.style.opacity = '1';
        wormElement.style.visibility = 'visible';

        this.wormContainer.appendChild(wormElement);

        // Store worm data with console slot reference
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * 2.0, // Crawling movement
            velocityY: (Math.random() - 0.5) * 1.0,
            active: true,
            hasStolen: false,
            isRushingToTarget: false,
            roamingEndTime: Date.now() + 10000, // Roam for 10 seconds
            isFlickering: false,
            baseSpeed: 2.0, // Updated base speed
            currentSpeed: 2.0,
            consoleSlotIndex: slotIndex,
            consoleSlotElement: slotElement,
            fromConsole: true,
            crawlPhase: 0, // For crawling animation
            direction: Math.random() * Math.PI * 2 // Random initial direction
        };

        this.worms.push(wormData);

        // Add click handler with RISK/REWARD: 80% kill, 20% clone (makes 2 worms!)
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleWormClick(wormData);
        });

        console.log(`✅ Worm ${wormId} spawned at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);
        console.log(`🐛 Worm will roam for 10 seconds before stealing`);

        // AUTO-TRIGGER: Check if snake should auto-spawn (emergency backup)
        this.checkAutoTriggerSnake();

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

        // Create worm element
        const wormId = `worm-${Date.now()}-${Math.random()}`;
        const wormElement = document.createElement('div');
        wormElement.className = 'worm-container';
        wormElement.id = wormId;

        // Worm body with segments
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        wormElement.appendChild(wormBody);

        // Random starting position at bottom
        const containerWidth = this.wormContainer.offsetWidth || 800;
        const containerHeight = this.wormContainer.offsetHeight || 600;
        const startX = Math.random() * Math.max(0, containerWidth - 80);
        const startY = Math.max(0, containerHeight - 30);

        wormElement.style.left = `${startX}px`;
        wormElement.style.top = `${startY}px`;
        wormElement.style.position = 'absolute';
        wormElement.style.zIndex = '10000'; // MAXIMUM z-index - in front of ALL layers
        wormElement.style.opacity = '1';
        wormElement.style.visibility = 'visible';

        this.wormContainer.appendChild(wormElement);

        // Store worm data (non-console worm)
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * 1.0,
            velocityY: (Math.random() - 0.5) * 0.5,
            active: true,
            hasStolen: false,
            roamingEndTime: Date.now() + 10000,
            isFlickering: false,
            baseSpeed: 1.0,
            currentSpeed: 1.0,
            fromConsole: false
        };

        this.worms.push(wormData);

        // Add click handler with RISK/REWARD: 80% kill, 20% multiply!
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleWormClick(wormData);
        });

        console.log(`✅ Worm ${wormId} spawned (fallback mode). Total worms: ${this.worms.length}`);

        // AUTO-TRIGGER: Check if snake should auto-spawn (emergency backup)
        this.checkAutoTriggerSnake();

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

        // Create purple worm element
        const wormId = `purple-worm-${Date.now()}-${Math.random()}`;
        const wormElement = document.createElement('div');
        wormElement.className = 'worm-container purple-worm';
        wormElement.id = wormId;

        // Worm body with segments
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        wormElement.appendChild(wormBody);

        // Random starting position (dramatic entrance from top)
        const containerWidth = this.wormContainer.offsetWidth || 800;
        const startX = Math.random() * Math.max(0, containerWidth - 80);
        const startY = -50; // Start above container

        wormElement.style.left = `${startX}px`;
        wormElement.style.top = `${startY}px`;
        wormElement.style.position = 'absolute';
        wormElement.style.zIndex = '10000';
        wormElement.style.opacity = '1';
        wormElement.style.visibility = 'visible';

        this.wormContainer.appendChild(wormElement);

        // Store purple worm data
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * 2.0,
            velocityY: Math.random() * 1.5 + 1.0, // Downward movement
            active: true,
            hasStolen: false,
            isRushingToTarget: false,
            roamingEndTime: Date.now() + 8000, // Roam for 8 seconds
            isFlickering: false,
            baseSpeed: 2.0,
            currentSpeed: 2.0,
            isPurple: true, // FLAG: This is a purple worm!
            fromConsole: false,
            shouldExitToConsole: true, // Purple worms exit through console
            exitingToConsole: false,
            targetConsoleSlot: null,
            crawlPhase: 0,
            direction: Math.random() * Math.PI * 2,
            canStealBlue: true // Purple worms can steal blue symbols
        };

        this.worms.push(wormData);

        // PURPLE WORM CLICK: 50% clone chance (vs 20% for normal worms)
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handlePurpleWormClick(wormData);
        });

        console.log(`🟣 Purple worm ${wormId} spawned at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);
        console.log(`🟣 Purple worm has 50% clone chance and can steal BLUE symbols!`);

        // AUTO-TRIGGER: Check if snake should auto-spawn
        this.checkAutoTriggerSnake();

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    stealSymbol(worm) {
        // PERFORMANCE: Use cached revealed symbols instead of querying every time
        const revealedSymbols = this.getCachedRevealedSymbols();

        // CLONING CURSE: Allow stealing BLUE symbols (revealed-symbol class) when curse is active
        // PURPLE WORM: Also allow stealing blue symbols (they have canStealBlue flag)
        let availableSymbols;
        if (this.cloningCurseActive || worm.canStealBlue) {
            // Curse active OR purple worm - can steal ANY revealed symbol (red or blue)
            availableSymbols = Array.from(revealedSymbols).filter(el =>
                !el.dataset.stolen &&
                !el.classList.contains('space-symbol') &&
                !el.classList.contains('completed-row-symbol')
            );
            if (worm.isPurple) {
                console.log(`🟣 PURPLE WORM - Can steal blue symbols! ${availableSymbols.length} symbols available`);
            } else {
                console.log(`🔮 CURSE ACTIVE - Worm can steal blue symbols! ${availableSymbols.length} symbols available`);
            }
        } else {
            // Normal mode - only steal red (hidden) symbols
            availableSymbols = Array.from(revealedSymbols).filter(el =>
                !el.dataset.stolen &&
                !el.classList.contains('space-symbol') &&
                !el.classList.contains('completed-row-symbol')
            );
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

        // Track if this was a blue symbol for replacement priority
        if (wasBlueSymbol && this.cloningCurseActive) {
            this.stolenBlueSymbols.push({
                symbol: symbolValue,
                element: targetSymbol,
                wormId: worm.id
            });
            console.log(`📋 Tracking stolen BLUE symbol "${symbolValue}" for priority replacement`);

            // Mark the element so game.js knows it was blue before being stolen
            targetSymbol.dataset.wasRevealed = 'true';
        }

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
    }

    animate() {
        if (this.worms.length === 0) {
            this.animationFrameId = null;
            return;
        }

        const currentTime = Date.now();
        const panelB = this.wormContainer;
        const panelBRect = panelB.getBoundingClientRect();
        const panelBWidth = panelB.offsetWidth || 800;
        const panelBHeight = panelB.offsetHeight || 600;

        // SNAKE EVASION: Check if snake is active and close to worms
        let snakePosition = null;
        let snakeDetectionRadius = 0;
        let snakeIsActive = false;

        if (window.snakeWeapon && window.snakeWeapon.isSnakeActive()) {
            snakeIsActive = true;
            snakePosition = window.snakeWeapon.getSnakePosition();
            snakeDetectionRadius = window.snakeWeapon.getDetectionRadius();
        }

        this.worms.forEach(worm => {
            if (!worm.active) return;

            // SNAKE EVASION: Check if worm needs to flee from snake
            if (snakeIsActive && snakePosition) {
                const dx = worm.x - snakePosition.x;
                const dy = worm.y - snakePosition.y;
                const distanceToSnake = Math.sqrt(dx * dx + dy * dy);

                if (distanceToSnake < snakeDetectionRadius) {
                    // FLEE FROM SNAKE!
                    console.log(`🏃 Worm ${worm.id} fleeing from snake! Distance: ${distanceToSnake.toFixed(0)}px`);

                    // Set flee velocity (opposite direction from snake, 1.2x speed boost)
                    const fleeSpeed = worm.baseSpeed * 1.2;
                    worm.velocityX = (dx / distanceToSnake) * fleeSpeed;
                    worm.velocityY = (dy / distanceToSnake) * fleeSpeed;

                    // Mark worm as fleeing (visual indicator)
                    if (!worm.element.classList.contains('fleeing')) {
                        worm.element.classList.add('fleeing');
                    }
                } else if (worm.element.classList.contains('fleeing')) {
                    // Snake far away now - remove flee state
                    worm.element.classList.remove('fleeing');
                }
            }

            // Update crawl phase for animation
            worm.crawlPhase = (worm.crawlPhase + 0.05) % (Math.PI * 2);

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
                    const containerRect = this.getCachedContainerRect(); // PERFORMANCE: Use cached rect

                    const targetX = targetRect.left - containerRect.left + (targetRect.width / 2);
                    const targetY = targetRect.top - containerRect.top + (targetRect.height / 2);

                    const dx = targetX - worm.x;
                    const dy = targetY - worm.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

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
            // Roaming behavior - crawling movement ONLY in Panel B
            else if (!worm.hasStolen && !worm.isRushingToTarget) {
                // Update direction slightly for natural movement
                worm.direction += (Math.random() - 0.5) * 0.1;

                // Crawling movement with inchworm effect
                const crawlOffset = Math.sin(worm.crawlPhase) * 0.5;
                worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
                worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

                worm.x += worm.velocityX;
                worm.y += worm.velocityY;

                // STRICT PANEL B BOUNDARIES
                const margin = 20;
                if (worm.x < margin) {
                    worm.x = margin;
                    worm.direction = Math.PI - worm.direction; // Reflect horizontally
                }
                if (worm.x > panelBWidth - margin) {
                    worm.x = panelBWidth - margin;
                    worm.direction = Math.PI - worm.direction;
                }
                if (worm.y < margin) {
                    worm.y = margin;
                    worm.direction = -worm.direction; // Reflect vertically
                }
                if (worm.y > panelBHeight - margin) {
                    worm.y = panelBHeight - margin;
                    worm.direction = -worm.direction;
                }

                // Rotate worm body to face movement direction (head points forward)
                // Worm segments are laid out left-to-right, so head should point in direction
                // FIX: Add π (180°) to flip worm so head faces forward instead of backward
                worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
            }
            // Carrying symbol - return to console hole
            else if (worm.hasStolen && worm.fromConsole && worm.consoleSlotElement) {
                const slotRect = worm.consoleSlotElement.getBoundingClientRect();
                const containerRect = this.getCachedContainerRect(); // PERFORMANCE: Use cached rect

                const targetX = slotRect.left - containerRect.left + (slotRect.width / 2);
                const targetY = slotRect.top - containerRect.top + (slotRect.height / 2);

                const dx = targetX - worm.x;
                const dy = targetY - worm.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 20) {
                    // Reached console hole - escape with symbol!
                    console.log(`🐛 Worm ${worm.id} escaped to console with symbol "${worm.stolenSymbol}"!`);
                    console.log(`💀 Symbol "${worm.stolenSymbol}" stays HIDDEN until user clicks it again in Panel C`);
                    this.removeWorm(worm);
                    return;
                }

                // Move towards console with LSD colors!
                worm.direction = Math.atan2(dy, dx);
                worm.velocityX = (dx / distance) * worm.currentSpeed;
                worm.velocityY = (dy / distance) * worm.currentSpeed;

                worm.x += worm.velocityX;
                worm.y += worm.velocityY;

                // Rotate towards console (head points forward)
                // FIX: Add π (180°) to flip worm so head faces forward
                worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
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
                        const containerRect = this.getCachedContainerRect();

                        const targetX = slotRect.left - containerRect.left + (slotRect.width / 2);
                        const targetY = slotRect.top - containerRect.top + (slotRect.height / 2);

                        const dx = targetX - worm.x;
                        const dy = targetY - worm.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

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
                        worm.direction += (Math.random() - 0.5) * 0.1;

                        const crawlOffset = Math.sin(worm.crawlPhase) * 0.5;
                        worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
                        worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

                        worm.x += worm.velocityX;
                        worm.y += worm.velocityY;
                    }
                } else {
                    // Normal worm carrying symbol - continue roaming
                    worm.direction += (Math.random() - 0.5) * 0.1;

                    const crawlOffset = Math.sin(worm.crawlPhase) * 0.5;
                    worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
                    worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

                    worm.x += worm.velocityX;
                    worm.y += worm.velocityY;
                }

                // STRICT PANEL B BOUNDARIES
                const margin = 20;
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
                // FIX: Add π (180°) to flip worm so head faces forward
                worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
            }

            // Apply position directly (no CSS transitions for smooth crawling)
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

    handleWormClick(worm) {
        if (!worm.active) return;

        // CLONING CURSE MECHANIC
        if (this.cloningCurseActive) {
            // Curse is active - ANY worm click will clone instead of kill!
            console.log(`🔮 CLONING CURSE ACTIVE! Worm ${worm.id} clicked - CREATING CLONE!`);

            // Visual feedback for curse activation
            worm.element.style.animation = 'worm-flash-purple 0.3s ease-out';
            setTimeout(() => {
                worm.element.style.animation = '';
            }, 300);

            // Clone the worm
            this.cloneWorm(worm);
            return;
        }

        // 80/20 RISK/REWARD MECHANIC
        // 80% chance: Worm explodes (normal kill)
        // 20% chance: Worm clones AND activates cloning curse
        const roll = Math.random() * 100; // 0-100

        if (roll < 80) {
            // 80% - BOOM! Normal worm kill
            console.log(`💥 BOOM! Worm ${worm.id} exploded (${roll.toFixed(1)}% roll - under 80% threshold)`);
            this.explodeWorm(worm, false); // false = not a rain kill
        } else {
            // 20% - Clone AND activate curse!
            console.log(`🔮 CLONE EVENT! Worm ${worm.id} cloned (${roll.toFixed(1)}% roll - over 80% threshold)`);
            console.log(`⚠️ CLONING CURSE ACTIVATED! All future worm clicks will clone until curse reset!`);

            this.cloningCurseActive = true;
            this.wormsKilledByRain = 0; // Reset rain kill counter

            // Visual feedback for curse activation
            worm.element.style.animation = 'worm-flash-purple 0.5s ease-out';
            setTimeout(() => {
                worm.element.style.animation = '';
            }, 500);

            // Create a clone
            this.cloneWorm(worm);
        }
    }

    // PURPLE WORM: Special click handler with 50% clone chance
    handlePurpleWormClick(worm) {
        if (!worm.active) return;

        console.log(`🟣 Purple worm ${worm.id} clicked!`);

        // CLONING CURSE MECHANIC - applies to purple worms too
        if (this.cloningCurseActive) {
            console.log(`🔮 CURSE ACTIVE! Purple worm will clone!`);
            worm.element.style.animation = 'worm-flash-purple 0.3s ease-out';
            setTimeout(() => {
                worm.element.style.animation = '';
            }, 300);
            this.clonePurpleWorm(worm);
            return;
        }

        // PURPLE WORM: 50/50 SPLIT
        // 50% chance: Worm explodes (kill)
        // 50% chance: Worm clones
        const roll = Math.random() * 100; // 0-100

        if (roll < 50) {
            // 50% - BOOM! Purple worm kill
            console.log(`💥 BOOM! Purple worm ${worm.id} exploded (${roll.toFixed(1)}% roll - under 50% threshold)`);
            this.explodeWorm(worm, false);
        } else {
            // 50% - Clone (but don't activate curse - only normal worms do that)
            console.log(`🟣 CLONE! Purple worm ${worm.id} cloned (${roll.toFixed(1)}% roll - over 50% threshold)`);

            // Visual feedback
            worm.element.style.animation = 'worm-flash-purple 0.5s ease-out';
            setTimeout(() => {
                worm.element.style.animation = '';
            }, 500);

            // Create a purple clone
            this.clonePurpleWorm(worm);
        }
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

        // Position near parent worm with slight offset
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        const newX = parentWorm.x + offsetX;
        const newY = parentWorm.y + offsetY;

        newWormElement.style.left = `${newX}px`;
        newWormElement.style.top = `${newY}px`;
        newWormElement.style.position = 'absolute';
        newWormElement.style.zIndex = '10000';
        newWormElement.style.opacity = '1';
        newWormElement.style.visibility = 'visible';

        this.wormContainer.appendChild(newWormElement);

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
            roamingEndTime: Date.now() + 10000,
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

        // Position clone near parent with random offset
        const offset = 30;
        const newX = parentWorm.x + (Math.random() - 0.5) * offset * 2;
        const newY = parentWorm.y + (Math.random() - 0.5) * offset * 2;

        newWormElement.style.left = `${newX}px`;
        newWormElement.style.top = `${newY}px`;
        newWormElement.style.position = 'absolute';
        newWormElement.style.zIndex = '10000';
        newWormElement.style.opacity = '1';
        newWormElement.style.visibility = 'visible';

        this.wormContainer.appendChild(newWormElement);

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

        // Auto-trigger snake check
        this.checkAutoTriggerSnake();

        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    explodeWorm(worm, isRainKill = false) {
        console.log(`💥 EXPLODING worm ${worm.id} (${isRainKill ? 'RAIN KILL' : 'direct click'}) and returning symbol "${worm.stolenSymbol}"!`);

        // Return stolen symbol to its original position
        if (worm.targetElement) {
            worm.targetElement.classList.remove('stolen', 'hidden-symbol');
            worm.targetElement.classList.add('revealed-symbol');
            worm.targetElement.style.visibility = 'visible';
            delete worm.targetElement.dataset.stolen;

            // Remove from stolen blue symbols tracking if it was a blue symbol
            if (worm.wasBlueSymbol) {
                this.stolenBlueSymbols = this.stolenBlueSymbols.filter(s => s.wormId !== worm.id);
                console.log(`📋 Removed from stolen blue symbols tracking. Remaining: ${this.stolenBlueSymbols.length}`);
            }

            console.log(`✅ Symbol "${worm.stolenSymbol}" returned to Panel B`);
        }

        // DRAMATIC EXPLOSION EFFECT
        worm.element.classList.add('worm-exploding');

        // Create explosion particles
        this.createExplosionParticles(worm.x, worm.y);

        // Flash the screen (different color for rain kills during curse)
        if (isRainKill && this.cloningCurseActive) {
            this.createExplosionFlash('#00ffff'); // Cyan flash for curse rain kills
        } else {
            this.createExplosionFlash();
        }

        // Create persistent crack at worm's location
        this.createCrack(worm.x, worm.y);

        // Create slime splat that lasts 15 seconds
        this.createSlimeSplat(worm.x, worm.y);

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
        const panelC = document.getElementById('third-display');
        if (panelC) {
            panelC.appendChild(crack);
            console.log(`💥 Crack created at (${x}, ${y})`);
        }
    }

    cleanupCracks() {
        const panelC = document.getElementById('third-display');
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

    // AUTO-TRIGGER: Check if snake should automatically spawn (emergency backup)
    checkAutoTriggerSnake() {
        const activeWorms = this.worms.filter(w => w.active);

        // Auto-trigger threshold: 6 worms (player can manually trigger at 4+)
        const AUTO_TRIGGER_THRESHOLD = 6;

        console.log(`🐍 Auto-trigger check: ${activeWorms.length} active worms (threshold: ${AUTO_TRIGGER_THRESHOLD})`);

        if (activeWorms.length >= AUTO_TRIGGER_THRESHOLD) {
            // Check if snake exists
            if (!window.snakeWeapon) {
                console.log('⚠️ window.snakeWeapon not found - snake system not initialized');
                return;
            }

            console.log(`🐍 Snake weapon exists. usedThisProblem: ${window.snakeWeapon.usedThisProblem}`);

            // Check if snake already used this problem
            if (window.snakeWeapon && !window.snakeWeapon.usedThisProblem) {
                console.log(`🚨 AUTO-TRIGGER! ${activeWorms.length} worms reached - spawning snake automatically!`);

                // Dispatch same event as manual lock click
                document.dispatchEvent(new CustomEvent('snakeWeaponTriggered', {
                    detail: {
                        wormCount: activeWorms.length,
                        autoTriggered: true // Flag to indicate this was automatic
                    }
                }));
            } else if (window.snakeWeapon && window.snakeWeapon.usedThisProblem) {
                console.log(`⚠️ Snake already used this problem - no auto-trigger available`);
            }
        } else {
            console.log(`✅ ${activeWorms.length} worms - below auto-trigger threshold`);
        }
    }
}

// Initialize global worm system
document.addEventListener('DOMContentLoaded', () => {
    window.wormSystem = new WormSystem();
    console.log('✅ Global wormSystem created');

    // Clean up cracks when problem is completed
    document.addEventListener('problemCompleted', () => {
        if (window.wormSystem) {
            console.log('🎯 Problem completed - killing all worms!');
            window.wormSystem.killAllWorms();
            // Clean up cracks after worms are killed
            setTimeout(() => {
                window.wormSystem.cleanupCracks();
            }, 2000); // Wait 2 seconds for explosions to finish
        }
    });
    console.log('✅ Worm extermination listener registered for problemCompleted event');
});
