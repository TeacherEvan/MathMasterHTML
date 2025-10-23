// js/worm-factory.js - Worm Creation and Factory Methods
console.log("🏭 Worm Factory Module Loading...");

/**
 * WormFactory - Handles creation of worm elements and data objects
 * 
 * This factory implements the Factory Pattern to centralize worm creation logic.
 * Extracted from WormSystem to reduce complexity and improve maintainability.
 * 
 * @class
 * @example
 * const factory = new WormFactory({
 *   segmentCount: 5,
 *   zIndex: 10000,
 *   dropRate: 0.10
 * });
 * 
 * const wormElement = factory.createWormElement({
 *   id: 'worm-123',
 *   classNames: ['purple-worm'],
 *   x: 100,
 *   y: 200
 * });
 */
class WormFactory {
    /**
     * Create a new WormFactory instance
     * @param {Object} config - Factory configuration
     * @param {number} [config.segmentCount=5] - Default number of worm segments
     * @param {number} [config.zIndex=10000] - Z-index for worm elements
     * @param {number} [config.dropRate=0.10] - Power-up drop rate (0-1)
     * @param {string[]} [config.powerUpTypes=['chainLightning','spider','devil']] - Available power-up types
     */
    constructor(config = {}) {
        this.WORM_SEGMENT_COUNT = config.segmentCount || 5;
        this.WORM_Z_INDEX = config.zIndex || 10000;
        this.POWER_UP_DROP_RATE = config.dropRate || 0.10;
        this.POWER_UP_TYPES = config.powerUpTypes || ['chainLightning', 'spider', 'devil'];
        
        console.log('🏭 WormFactory initialized');
    }

    /**
     * Create worm DOM element with consistent structure
     * @param {Object} config - Worm element configuration
     * @param {string} config.id - Unique worm ID
     * @param {string[]} config.classNames - Additional CSS classes
     * @param {number} config.segmentCount - Number of worm segments (optional)
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

        // Validate required parameters
        if (!id) {
            throw new Error('WormFactory: id is required to create worm element');
        }
        if (x === undefined || y === undefined) {
            throw new Error('WormFactory: x and y coordinates are required');
        }

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

    /**
     * Create worm data object with consistent structure
     * @param {Object} config - Worm data configuration
     * @param {string} config.id - Unique worm ID
     * @param {HTMLElement} config.element - Worm DOM element
     * @param {number} config.x - Starting X position
     * @param {number} config.y - Starting Y position
     * @param {number} config.baseSpeed - Base movement speed
     * @param {number} config.roamDuration - How long to roam before stealing
     * @param {boolean} config.isPurple - Whether this is a purple worm
     * @param {boolean} config.fromConsole - Whether spawned from console
     * @param {number} config.consoleSlotIndex - Console slot index (if fromConsole)
     * @param {HTMLElement} config.consoleSlotElement - Console slot element (if fromConsole)
     * @param {string} config.targetSymbol - Initial target symbol
     * @returns {Object} Configured worm data object
     */
    createWormData(config) {
        const {
            id,
            element,
            x,
            y,
            baseSpeed,
            roamDuration,
            isPurple = false,
            fromConsole = false,
            consoleSlotIndex = undefined,
            consoleSlotElement = undefined,
            targetSymbol = null
        } = config;

        // Validate required parameters
        if (!id || !element) {
            throw new Error('WormFactory: id and element are required');
        }

        // Power-up roll (10% chance)
        const hasPowerUp = Math.random() < this.POWER_UP_DROP_RATE;
        const powerUpType = hasPowerUp ? 
            this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)] : 
            null;

        // Create base worm data
        const wormData = {
            id: id,
            element: element,
            stolenSymbol: null,
            targetElement: null,
            targetSymbol: targetSymbol,
            x: x,
            y: y,
            velocityX: (Math.random() - 0.5) * baseSpeed,
            velocityY: (Math.random() - 0.5) * (isPurple ? 0.75 : 1.0),
            active: true,
            hasStolen: false,
            isRushingToTarget: isPurple || (targetSymbol !== null),
            roamingEndTime: Date.now() + roamDuration,
            isFlickering: false,
            baseSpeed: baseSpeed,
            currentSpeed: baseSpeed,
            fromConsole: fromConsole,
            crawlPhase: Math.random() * Math.PI * 2,
            direction: Math.random() * Math.PI * 2,
            hasPowerUp: hasPowerUp,
            powerUpType: powerUpType
        };

        // Console-specific properties
        if (fromConsole) {
            wormData.consoleSlotIndex = consoleSlotIndex;
            wormData.consoleSlotElement = consoleSlotElement;
        }

        // Purple worm-specific properties
        if (isPurple) {
            wormData.isPurple = true;
            wormData.shouldExitToConsole = true;
            wormData.exitingToConsole = false;
            wormData.targetConsoleSlot = null;
            wormData.canStealBlue = true;
            wormData.prioritizeRed = true;
        } else {
            // Border worms exit to console
            wormData.shouldExitToConsole = !fromConsole;
            wormData.exitingToConsole = false;
            wormData.targetConsoleSlot = null;
        }

        if (hasPowerUp) {
            console.log(`✨ Worm ${id} has power-up: ${powerUpType}`);
        }

        return wormData;
    }

    /**
     * Calculate spawn position on border
     * @param {number} index - Spawn index
     * @param {number} total - Total number of spawns
     * @param {number} margin - Border margin in pixels
     * @returns {Object} {x, y} spawn coordinates
     */
    calculateBorderSpawnPosition(index, total, margin = 20) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const position = index / total; // 0 to 1

        let x, y;

        if (position < 0.5) {
            // Bottom border (0-50%)
            const xPosition = position * 2;
            x = margin + xPosition * (viewportWidth - 2 * margin);
            y = viewportHeight - margin;
        } else if (position < 0.75) {
            // Left border (50-75%)
            const yPosition = (position - 0.5) * 4;
            x = margin;
            y = margin + yPosition * (viewportHeight - 2 * margin);
        } else {
            // Right border (75-100%)
            const yPosition = (position - 0.75) * 4;
            x = viewportWidth - margin;
            y = margin + yPosition * (viewportHeight - 2 * margin);
        }

        return { x, y };
    }

    /**
     * Calculate random fallback spawn position
     * @returns {Object} {x, y} spawn coordinates
     */
    calculateFallbackSpawnPosition() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        return {
            x: Math.random() * Math.max(0, viewportWidth - 80),
            y: Math.max(0, viewportHeight - 30)
        };
    }
}

// Export for use in other modules (if using ES6 modules) or attach to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WormFactory;
} else {
    window.WormFactory = WormFactory;
}

console.log('✅ Worm Factory Module Loaded');
