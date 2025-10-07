// js/snake-weapon.js - Red Snake Weapon System
console.log("🐍 Snake Weapon System Loading...");

class SnakeWeapon {
    constructor() {
        this.snake = null;
        this.snakeElement = null;
        this.isActive = false;
        this.isReturning = false;
        this.usedThisProblem = false; // One-use-per-problem restriction
        this.animationFrameId = null;
        this.wormsEaten = 0;
        this.targetWorm = null;

        // Snake properties
        this.x = 0;
        this.y = 0;
        this.speed = 1.8; // 10% slower than worms (worm base = 2.0)
        this.segments = 10; // Twice as many as worm (worm has 5)
        this.segmentSize = 18; // Twice the size of worm segments (worm = 9px)
        this.detectionRadius = 200; // Distance at which worms detect snake
        this.eatingRadius = 25; // Distance for eating worms

        // Panel references and boundaries (cached for performance)
        this.panelA = null;
        this.panelB = null;
        this.panelC = null;
        this.lockDisplay = null;
        this.cachedPanelBounds = null;
        this.boundsLastUpdate = 0;
        this.BOUNDS_CACHE_DURATION = 500; // Refresh every 500ms

        // Movement trail for body segments
        this.trail = [];
        this.maxTrailLength = this.segments * 3; // Smooth slithering effect

        console.log('🐍 SnakeWeapon initialized');
        this.init();
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Get panel references
        this.panelA = document.querySelector('.game-container .display:nth-child(1)');
        this.panelB = document.querySelector('.game-container .display:nth-child(3)'); // Panel B is 3rd (after wall)
        this.panelC = document.querySelector('.game-container .display:nth-child(5)'); // Panel C is 5th
        this.lockDisplay = document.getElementById('lock-display');

        if (!this.panelA || !this.panelB || !this.panelC || !this.lockDisplay) {
            console.error('❌ Snake Weapon: Required panels not found');
            return;
        }

        console.log('✅ Snake Weapon panels found');

        // Cache panel boundaries
        this.updatePanelBounds();

        // Listen for problem completion to reset availability
        document.addEventListener('problemCompleted', () => {
            console.log('🐍 Problem completed - resetting snake availability');
            this.usedThisProblem = false;
        });

        // Listen for snake trigger event (dispatched by lock click)
        document.addEventListener('snakeWeaponTriggered', (e) => {
            console.log('🐍 Snake weapon triggered!', e.detail);
            this.spawnSnake();
        });

        console.log('🐍 Snake Weapon System ready!');
    }

    // PERFORMANCE: Cache panel boundaries with time-based invalidation
    updatePanelBounds() {
        const now = Date.now();
        if (this.cachedPanelBounds && (now - this.boundsLastUpdate) < this.BOUNDS_CACHE_DURATION) {
            return this.cachedPanelBounds;
        }

        this.cachedPanelBounds = {
            panelA: this.panelA.getBoundingClientRect(),
            panelB: this.panelB.getBoundingClientRect(),
            panelC: this.panelC.getBoundingClientRect(),
            lockDisplay: this.lockDisplay.getBoundingClientRect()
        };
        this.boundsLastUpdate = now;

        console.log('📏 Panel bounds cached:', this.cachedPanelBounds);
        return this.cachedPanelBounds;
    }

    spawnSnake() {
        if (this.isActive) {
            console.log('⚠️ Snake already active');
            return;
        }

        if (this.usedThisProblem) {
            console.log('⚠️ Snake already used this problem');
            // Visual feedback - lock flashes red
            this.lockDisplay.style.animation = 'lock-flash-red 0.5s ease-out';
            setTimeout(() => {
                this.lockDisplay.style.animation = '';
            }, 500);
            return;
        }

        console.log('🐍 Spawning red snake from lock!');

        // Mark as used for this problem
        this.usedThisProblem = true;
        this.wormsEaten = 0;

        // Create snake element
        this.createSnakeElement();

        // Position at lock center
        const bounds = this.updatePanelBounds();
        const lockRect = bounds.lockDisplay;
        const panelARect = bounds.panelA;

        // Snake spawns from center of lock in Panel A
        this.x = lockRect.left + lockRect.width / 2 - panelARect.left;
        this.y = lockRect.top + lockRect.height / 2 - panelARect.top;

        // Initialize trail
        this.trail = [];
        for (let i = 0; i < this.maxTrailLength; i++) {
            this.trail.push({ x: this.x, y: this.y });
        }

        // Activate and start hunting
        this.isActive = true;
        this.isReturning = false;

        // Start animation loop
        this.animate();

        console.log(`🐍 Snake spawned at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
    }

    createSnakeElement() {
        // Create main snake container
        this.snakeElement = document.createElement('div');
        this.snakeElement.className = 'snake-weapon';
        this.snakeElement.id = 'red-snake';

        // Create snake body with segments
        const snakeBody = document.createElement('div');
        snakeBody.className = 'snake-body';

        for (let i = 0; i < this.segments; i++) {
            const segment = document.createElement('div');
            segment.className = 'snake-segment';
            segment.style.setProperty('--segment-index', i);

            // Head segment gets special treatment
            if (i === 0) {
                segment.classList.add('snake-head');
                // Add forked tongue as pseudo-element (CSS handles this)
            }

            snakeBody.appendChild(segment);
        }

        this.snakeElement.appendChild(snakeBody);

        // Append to Panel A (starts here, but can move anywhere)
        this.panelA.appendChild(this.snakeElement);

        console.log('✅ Snake element created with', this.segments, 'segments');
    }

    animate() {
        if (!this.isActive) {
            this.animationFrameId = null;
            return;
        }

        // Update panel bounds periodically
        this.updatePanelBounds();

        if (this.isReturning) {
            this.moveTowardsLock();
        } else {
            this.huntWorms();
        }

        // Update trail
        this.updateTrail();

        // Update visual position
        this.updateSnakePosition();

        // Check if snake has eaten all worms
        this.checkAllWormsEaten();

        // Continue animation
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    huntWorms() {
        // Get active worms from WormSystem
        if (!window.wormSystem || !window.wormSystem.worms) {
            console.log('⚠️ No worm system found');
            this.returnToLock();
            return;
        }

        const activeWorms = window.wormSystem.worms.filter(w => w.active);

        if (activeWorms.length === 0) {
            console.log('🐍 No more worms to hunt - returning to lock');
            this.returnToLock();
            return;
        }

        // Find nearest worm
        let nearestWorm = null;
        let nearestDistance = Infinity;

        activeWorms.forEach(worm => {
            const distance = this.getDistanceToWorm(worm);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestWorm = worm;
            }
        });

        if (nearestWorm) {
            this.targetWorm = nearestWorm;
            this.moveTowardsWorm(nearestWorm);

            // Check if close enough to eat
            if (nearestDistance < this.eatingRadius) {
                this.eatWorm(nearestWorm);
            }
        }
    }

    getDistanceToWorm(worm) {
        // Worms are in Panel B, snake position needs to be converted to absolute coordinates
        const bounds = this.updatePanelBounds();
        const panelARect = bounds.panelA;
        const panelBRect = bounds.panelB;

        // Snake's absolute position (relative to viewport)
        const snakeAbsX = panelARect.left + this.x;
        const snakeAbsY = panelARect.top + this.y;

        // Worm's absolute position (worm.x/y are relative to Panel B)
        const wormAbsX = panelBRect.left + worm.x;
        const wormAbsY = panelBRect.top + worm.y;

        const dx = snakeAbsX - wormAbsX;
        const dy = snakeAbsY - wormAbsY;

        return Math.sqrt(dx * dx + dy * dy);
    }

    moveTowardsWorm(worm) {
        // Need to convert worm position from Panel B coordinates to snake coordinates
        const bounds = this.updatePanelBounds();
        const panelARect = bounds.panelA;
        const panelBRect = bounds.panelB;

        // Convert worm position from Panel B to absolute coordinates
        const wormAbsX = panelBRect.left + worm.x;
        const wormAbsY = panelBRect.top + worm.y;

        // Snake's absolute position
        const snakeAbsX = panelARect.left + this.x;
        const snakeAbsY = panelARect.top + this.y;

        // Calculate direction vector in absolute space
        const dx = wormAbsX - snakeAbsX;
        const dy = wormAbsY - snakeAbsY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Move snake in absolute space
            const moveAbsX = (dx / distance) * this.speed;
            const moveAbsY = (dy / distance) * this.speed;

            // Convert back to Panel A relative coordinates
            this.x += moveAbsX;
            this.y += moveAbsY;
        }
    }

    moveTowardsLock() {
        const bounds = this.updatePanelBounds();
        const lockRect = bounds.lockDisplay;
        const panelARect = bounds.panelA;

        // Lock center position (relative to Panel A)
        const lockX = lockRect.left + lockRect.width / 2 - panelARect.left;
        const lockY = lockRect.top + lockRect.height / 2 - panelARect.top;

        // Calculate direction to lock
        const dx = lockX - this.x;
        const dy = lockY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
            // Reached lock - deactivate snake
            console.log('🐍 Snake returned to lock');
            this.deactivateSnake();
            return;
        }

        // Move towards lock (faster return speed)
        const returnSpeed = this.speed * 1.5;
        const moveX = (dx / distance) * returnSpeed;
        const moveY = (dy / distance) * returnSpeed;

        this.x += moveX;
        this.y += moveY;
    }

    eatWorm(worm) {
        console.log(`🐍 CHOMP! Snake ate worm ${worm.id}`);

        // Remove worm via WormSystem
        if (window.wormSystem) {
            window.wormSystem.removeWorm(worm);
        }

        this.wormsEaten++;

        // Visual feedback - snake head enlarges briefly
        const head = this.snakeElement.querySelector('.snake-head');
        if (head) {
            head.classList.add('eating');
            setTimeout(() => {
                head.classList.remove('eating');
            }, 300);
        }

        // Flash effect
        this.createEatingFlash();

        console.log(`🐍 Worms eaten: ${this.wormsEaten}`);
    }

    createEatingFlash() {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100vw';
        flash.style.height = '100vh';
        flash.style.background = 'radial-gradient(circle, rgba(255,0,0,0.2), transparent)';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '999999';
        flash.style.animation = 'eating-flash 0.3s ease-out';

        document.body.appendChild(flash);

        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 300);
    }

    updateTrail() {
        // Add current position to trail
        this.trail.unshift({ x: this.x, y: this.y });

        // Keep trail length constant
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
    }

    updateSnakePosition() {
        if (!this.snakeElement) return;

        // Position snake head
        this.snakeElement.style.left = `${this.x}px`;
        this.snakeElement.style.top = `${this.y}px`;

        // Update segment positions based on trail
        const segments = this.snakeElement.querySelectorAll('.snake-segment');
        segments.forEach((segment, index) => {
            const trailIndex = index * 3; // Space out segments
            if (trailIndex < this.trail.length) {
                const pos = this.trail[trailIndex];
                segment.style.transform = `translate(${pos.x - this.x}px, ${pos.y - this.y}px)`;
            }
        });
    }

    checkAllWormsEaten() {
        if (this.isReturning) return;

        const activeWorms = window.wormSystem ? window.wormSystem.worms.filter(w => w.active) : [];

        if (activeWorms.length === 0 && this.wormsEaten > 0) {
            console.log('🐍 All worms eaten! Returning to lock...');
            this.returnToLock();
        }
    }

    returnToLock() {
        if (this.isReturning) return;

        console.log('🐍 Snake returning to lock');
        this.isReturning = true;
        this.targetWorm = null;
    }

    deactivateSnake() {
        console.log('🐍 Deactivating snake');

        this.isActive = false;
        this.isReturning = false;

        // Remove snake element
        if (this.snakeElement && this.snakeElement.parentNode) {
            this.snakeElement.parentNode.removeChild(this.snakeElement);
        }

        this.snakeElement = null;
        this.targetWorm = null;
        this.trail = [];

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        console.log(`🐍 Snake deactivated. Total worms eaten: ${this.wormsEaten}`);
    }

    // PUBLIC API: Check if snake is active (for worm evasion logic)
    isSnakeActive() {
        return this.isActive && !this.isReturning;
    }

    getSnakePosition() {
        // Return snake position in absolute coordinates for worm detection
        const bounds = this.updatePanelBounds();
        const panelARect = bounds.panelA;
        const panelBRect = bounds.panelB;

        // Snake position in absolute coordinates
        const snakeAbsX = panelARect.left + this.x;
        const snakeAbsY = panelARect.top + this.y;

        // Convert to Panel B relative coordinates for worm evasion logic
        const snakePanelBX = snakeAbsX - panelBRect.left;
        const snakePanelBY = snakeAbsY - panelBRect.top;

        return { x: snakePanelBX, y: snakePanelBY };
    }

    getDetectionRadius() {
        return this.detectionRadius;
    }
}

// Initialize global snake weapon system
window.snakeWeapon = new SnakeWeapon();

console.log('🐍 Snake Weapon System loaded');
