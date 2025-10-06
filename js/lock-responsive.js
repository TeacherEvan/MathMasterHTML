// js/lock-responsive.js - Automatic Display Resolution Detection and Lock Scaling
console.log("Loading Lock Responsive Manager...");

class LockResponsiveManager {
    constructor() {
        this.currentScale = 1;
        this.baseWidth = 300;  // Base lock container width
        this.baseHeight = 350; // Base lock container height
        this.minScale = 0.3;   // Minimum scale factor
        this.maxScale = 1.8;   // Maximum scale factor
        this.isInitialized = false;

        // Resolution breakpoints for different scaling
        this.resolutionBreakpoints = {
            '4k': { width: 3840, height: 2160, scale: 1.5 },
            '1440p': { width: 2560, height: 1440, scale: 1.3 },
            '1080p': { width: 1920, height: 1080, scale: 1.1 },
            '720p': { width: 1280, height: 720, scale: 0.9 },
            'mobile': { width: 768, height: 1024, scale: 0.8 }
        };

        this.init();
    }

    init() {
        console.log("🔧 Initializing Lock Responsive Manager");

        // Initial detection and scaling
        this.detectAndScale();

        // Listen for window resize events
        window.addEventListener('resize', this.debounce(() => {
            this.detectAndScale();
        }, 300));

        // Listen for orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.detectAndScale();
            }, 100);
        });

        // Monitor for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            setTimeout(() => {
                this.detectAndScale();
            }, 100);
        });

        this.isInitialized = true;
        console.log("✅ Lock Responsive Manager initialized");
    }

    detectAndScale() {
        const viewport = this.getViewportInfo();
        const resolution = this.detectResolution(viewport);
        const scale = this.calculateOptimalScale(viewport, resolution);

        console.log(`📱 Resolution detected: ${resolution} (${viewport.width}x${viewport.height})`);
        console.log(`🔍 Applying scale: ${scale}`);

        this.applyScaling(scale, resolution);
        this.currentScale = scale;
    }

    getViewportInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            orientation: window.orientation || 0,
            isPortrait: window.innerHeight > window.innerWidth,
            isLandscape: window.innerWidth > window.innerHeight
        };
    }

    detectResolution(viewport) {
        const { width, height } = viewport;

        // Check against resolution breakpoints
        if (width >= this.resolutionBreakpoints['4k'].width) {
            return '4k';
        } else if (width >= this.resolutionBreakpoints['1440p'].width) {
            return '1440p';
        } else if (width >= this.resolutionBreakpoints['1080p'].width) {
            return '1080p';
        } else if (width >= this.resolutionBreakpoints['720p'].width) {
            return '720p';
        } else {
            return 'mobile';
        }
    }

    calculateOptimalScale(viewport, resolution) {
        const breakpoint = this.resolutionBreakpoints[resolution];
        let scale = breakpoint.scale;

        // Fine-tune based on available space
        const lockDisplay = document.getElementById('lock-display');
        if (lockDisplay) {
            const parentRect = lockDisplay.parentElement.getBoundingClientRect();
            const availableWidth = parentRect.width * 0.8; // 80% of available width
            const availableHeight = parentRect.height * 0.8; // 80% of available height

            // Calculate scale based on available space
            const widthScale = availableWidth / this.baseWidth;
            const heightScale = availableHeight / this.baseHeight;

            // Use the smaller scale to ensure fit
            const spaceBasedScale = Math.min(widthScale, heightScale);

            // Combine resolution-based and space-based scaling
            scale = Math.min(scale, spaceBasedScale);
        }

        // Apply additional adjustments for special cases
        if (viewport.isPortrait && resolution === 'mobile') {
            scale *= 0.8; // Reduce scale for mobile portrait
        }

        if (viewport.devicePixelRatio > 2) {
            scale *= 1.1; // Slightly increase for high DPI displays
        }

        // Clamp to min/max bounds
        return Math.max(this.minScale, Math.min(this.maxScale, scale));
    }

    applyScaling(scale, resolution) {
        // Apply scaling to lock display container
        const lockDisplay = document.getElementById('lock-display');
        if (lockDisplay) {
            lockDisplay.style.setProperty('--lock-scale', scale);
            // DON'T apply transform or transformOrigin here - let CSS handle centering
            // lockDisplay.style.transform = `scale(${scale})`;
            // lockDisplay.style.transformOrigin = 'center center';

            // Adjust container size based on scale
            const scaledWidth = Math.floor(this.baseWidth * scale);
            const scaledHeight = Math.floor(this.baseHeight * scale);

            lockDisplay.style.maxWidth = `${scaledWidth}px`;
            lockDisplay.style.maxHeight = `${scaledHeight}px`;

            // Remove any margin overrides
            lockDisplay.style.marginTop = '';
        }

        // Apply scaling to lock containers
        const lockContainers = document.querySelectorAll('.lock-container');
        lockContainers.forEach(container => {
            const containerScale = scale * 0.9; // Slightly smaller for better fit
            container.style.transform = `scale(${containerScale})`;
            container.style.transformOrigin = 'center center'; // Center alignment
            container.style.marginTop = ''; // Remove margin override
        });

        // Apply scaling to lock bodies
        const lockBodies = document.querySelectorAll('.lock-body');
        lockBodies.forEach(body => {
            const bodyScale = scale * 0.8; // Even smaller for lock body
            body.style.transform = `scale(${bodyScale})`;
            body.style.transformOrigin = 'center center'; // Center alignment
        });

        // Apply scaling to lock component wrappers
        const lockWrappers = document.querySelectorAll('.lock-component-wrapper');
        lockWrappers.forEach(wrapper => {
            wrapper.style.paddingTop = ''; // Remove padding override
            wrapper.style.alignItems = 'center'; // Center alignment
        });

        // Add resolution class for CSS targeting
        document.body.classList.remove('res-4k', 'res-1440p', 'res-1080p', 'res-720p', 'res-mobile');
        document.body.classList.add(`res-${resolution}`);

        // Trigger custom event for other components
        document.dispatchEvent(new CustomEvent('lockScaleChanged', {
            detail: { scale, resolution }
        }));
    }

    // Debounce function to prevent excessive resize events
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public API methods
    getCurrentScale() {
        return this.currentScale;
    }

    forceScale(scale) {
        if (scale >= this.minScale && scale <= this.maxScale) {
            this.applyScaling(scale, 'custom');
            this.currentScale = scale;
            console.log(`🎯 Force applied scale: ${scale}`);
        }
    }

    resetToAuto() {
        this.detectAndScale();
    }

    getDebugInfo() {
        const viewport = this.getViewportInfo();
        const resolution = this.detectResolution(viewport);

        return {
            currentScale: this.currentScale,
            viewport,
            resolution,
            breakpoints: this.resolutionBreakpoints,
            isInitialized: this.isInitialized
        };
    }
}

// Create singleton instance
const lockResponsiveManager = new LockResponsiveManager();

// Make available globally
window.lockResponsiveManager = lockResponsiveManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = lockResponsiveManager;
}

// Integration with existing lock manager
if (window.lockManager) {
    console.log("🔗 Integrating with existing LockManager");

    // Listen for lock activation events and adjust scaling
    document.addEventListener('lockActivated', () => {
        setTimeout(() => {
            lockResponsiveManager.detectAndScale();
        }, 100);
    });

    // Override lock manager's component loading to include responsive scaling
    const originalLoadComponent = window.lockManager.loadLockComponent;
    if (originalLoadComponent) {
        window.lockManager.loadLockComponent = function (componentName) {
            return originalLoadComponent.call(this, componentName).then(() => {
                // Apply responsive scaling after component loads
                setTimeout(() => {
                    lockResponsiveManager.detectAndScale();
                }, 50);
            });
        };
    }
}

console.log("✅ Lock Responsive Manager loaded and integrated");
