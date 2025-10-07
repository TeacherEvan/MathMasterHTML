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

        // PERFORMANCE: DOM query caching
        this.cachedRevealedSymbols = null;
        this.revealedSymbolsCacheTime = 0;
        this.cachedContainerRect = null;
        this.containerRectCacheTime = 0;
        this.CACHE_DURATION_TARGETS = 100; // Refresh revealed symbols every 100ms
        this.CACHE_DURATION_RECT = 200; // Refresh container rect every 200ms

        console.log('🐛 WormSystem initialized with DOM query caching');

        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', (event) => {
            console.log('🐛 Worm System received problemLineCompleted event:', event.detail);
            this.spawnWormFromConsole();
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
                this.explodeWorm(worm);
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

        // Add click handler to CLONE worm (not just multiply)
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cloneWorm(wormData);
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

        // Add click handler
        wormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.multiplyWorm(wormData);
        });

        console.log(`✅ Worm ${wormId} spawned (fallback mode). Total worms: ${this.worms.length}`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    stealSymbol(worm) {
        // PERFORMANCE: Use cached revealed symbols instead of querying every time
        const revealedSymbols = this.getCachedRevealedSymbols();
        const availableSymbols = Array.from(revealedSymbols).filter(el =>
            !el.dataset.stolen &&
            !el.classList.contains('space-symbol') &&
            !el.classList.contains('completed-row-symbol')
        );

        if (availableSymbols.length === 0) {
            console.log('🐛 No revealed red symbols available to steal');
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

        console.log(`🐛 Worm ${worm.id} stealing RED symbol: "${symbolValue}"`);

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

        // ACTIVATE LSD FLICKER when stealing red symbol!
        console.log(`🌈 Worm ${worm.id} stole red symbol - ACTIVATING LSD FLICKER with 20% SPEED BOOST!`);
        worm.isFlickering = true;
        worm.element.classList.add('flickering');
        worm.currentSpeed = worm.baseSpeed * 1.2; // 20% speed boost!

        // Add stolen symbol indicator (symbol follows worm)
        const stolenSymbolDiv = document.createElement('div');
        stolenSymbolDiv.className = 'carried-symbol';
        stolenSymbolDiv.textContent = symbolValue;
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

        this.worms.forEach(worm => {
            if (!worm.active) return;

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
                // Continue crawling movement even after stealing
                worm.direction += (Math.random() - 0.5) * 0.1;

                const crawlOffset = Math.sin(worm.crawlPhase) * 0.5;
                worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
                worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

                worm.x += worm.velocityX;
                worm.y += worm.velocityY;

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

        // Add click handler to new clone
        newWormElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cloneWorm(cloneData);
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

    explodeWorm(worm) {
        console.log(`💥 EXPLODING worm ${worm.id} and returning symbol "${worm.stolenSymbol}"!`);

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

    createExplosionFlash() {
        const flash = document.createElement('div');
        flash.className = 'explosion-flash';
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
