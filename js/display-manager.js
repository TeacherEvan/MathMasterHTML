// js/display-manager.js - Auto Display Resolution Manager

console.log("🖥️ Loading Display Manager...");

class DisplayManager {
    constructor() {
        this.currentResolution = null;
        this.resolutions = {
            '4k': { width: 3840, minWidth: 2560, scale: 1.0, fontSize: '24px' },
            '1440p': { width: 2560, minWidth: 1920, scale: 0.9, fontSize: '20px' },
            '1080p': { width: 1920, minWidth: 1280, scale: 0.8, fontSize: '18px' },
            '720p': { width: 1280, minWidth: 768, scale: 0.7, fontSize: '16px' },
            'mobile': { width: 768, minWidth: 0, scale: 0.6, fontSize: '14px' }
        };
        this.init();
    }

    init() {
        console.log("🚀 Initializing Display Manager");
        this.detectAndApply();

        // Listen for window resize
        window.addEventListener('resize', debounce(() => {
            console.log("🔄 Window resized, re-detecting resolution");
            this.detectAndApply();
        }, 300));

        // Listen for orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                console.log("📱 Orientation changed, re-detecting resolution");
                this.detectAndApply();
            }, 100);
        });

        // Show resolution indicator
        this.showResolutionIndicator();
    }

    detectResolution() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        for (const [name, config] of Object.entries(this.resolutions)) {
            if (width >= config.minWidth) {
                return { name, config, width, height };
            }
        }

        return { name: 'mobile', config: this.resolutions.mobile, width, height };
    }

    detectAndApply() {
        const detected = this.detectResolution();
        this.currentResolution = detected;

        console.log(`📊 ========================================`);
        console.log(`📊 DISPLAY MANAGER - Resolution Detected`);
        console.log(`📊 Resolution: ${detected.name.toUpperCase()}`);
        console.log(`📊 Viewport: ${detected.width}x${detected.height}`);
        console.log(`� Scale: ${detected.config.scale}`);
        console.log(`📊 Base Font Size: ${detected.config.fontSize}`);
        console.log(`📊 ========================================`);

        // Apply resolution class to body
        document.body.className = document.body.className
            .replace(/\bres-\S+/g, '');
        document.body.classList.add(`res-${detected.name}`);        // Apply CSS variables for dynamic scaling
        document.documentElement.style.setProperty('--display-scale', detected.config.scale);
        document.documentElement.style.setProperty('--display-font-size', detected.config.fontSize);
        document.documentElement.style.setProperty('--viewport-width', `${detected.width}px`);
        document.documentElement.style.setProperty('--viewport-height', `${detected.height}px`);

        // Apply font sizes
        this.applyFontSizes(detected.config);

        // Apply symbol rain adjustments
        this.applySymbolRainAdjustments(detected.config);

        // Apply console adjustments
        this.applyConsoleAdjustments();

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('displayResolutionChanged', {
            detail: detected
        }));

        // Update resolution indicator
        this.updateResolutionIndicator(detected);
    }

    applyFontSizes(config) {
        // Determine if we're on mobile
        const mobile = isMobile();

        console.log(`📱 Mobile mode: ${mobile ? 'YES' : 'NO'}`);

        // Solution container - DECREASE to 36% on mobile for better vertical fit (20% smaller)
        const solutionContainer = document.getElementById('solution-container');
        if (solutionContainer) {
            if (mobile) {
                solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.252)`;
                solutionContainer.style.lineHeight = '1.2';
                console.log(`📱 Solution container font reduced to 25.2% for horizontal layout`);
            } else {
                solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.8)`;
                solutionContainer.style.lineHeight = '1.4';
            }
        }

        // Problem container - DECREASE to 32% on mobile to prevent edge cutoff (20% smaller)
        const problemContainer = document.getElementById('problem-container');
        if (problemContainer) {
            if (mobile) {
                problemContainer.style.fontSize = `calc(${config.fontSize} * 0.224)`;
                problemContainer.style.letterSpacing = '0.5px';
                console.log(`📱 Problem container font reduced to 22.4% for horizontal layout`);
            } else {
                problemContainer.style.fontSize = `calc(${config.fontSize} * 0.8)`;
                problemContainer.style.letterSpacing = '2px';
            }
        }

        // Back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.style.fontSize = `calc(${config.fontSize} * 0.9)`;
        }

        // Help button
        const helpButton = document.getElementById('help-button');
        if (helpButton) {
            helpButton.style.fontSize = `calc(${config.fontSize} * 0.9)`;
        }
    }

    applyConsoleAdjustments() {
        const consoleElement = document.getElementById('symbol-console');
        if (!consoleElement) return;

        if (isMobile()) {
            console.log('📱 Applying mobile console layout.');
            consoleElement.classList.add('mobile-layout');
        } else {
            console.log('🖥️ Applying desktop console layout.');
            consoleElement.classList.remove('mobile-layout');
        }
    }

    applySymbolRainAdjustments(config) {
        // Determine if we're on mobile
        const mobile = isMobile();

        // Adjust falling symbol sizes
        const style = document.createElement('style');
        style.id = 'dynamic-symbol-style';

        // Remove old style if exists
        const oldStyle = document.getElementById('dynamic-symbol-style');
        if (oldStyle) {
            oldStyle.remove();
        }

        // On mobile: increase falling symbols by 50% (1.5x larger)
        // On desktop: normal size
        const symbolMultiplier = mobile ? 1.8 : 1.2;

        style.textContent = `
            .falling-symbol {
                font-size: calc(${config.fontSize} * ${symbolMultiplier}) !important;
            }
        `;

        if (mobile) {
            console.log(`📱 Falling symbols increased by 50% (multiplier: ${symbolMultiplier})`);
        }

        document.head.appendChild(style);
    }

    showResolutionIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'resolution-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 255, 0, 0.2);
            border: 2px solid #0f0;
            color: #0f0;
            padding: 10px 15px;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
            pointer-events: none;
        `;
        indicator.textContent = 'DETECTING RESOLUTION...';
        document.body.appendChild(indicator);

        // Keep it hidden but functional
        // Indicator still exists for debugging if needed via console
    }

    updateResolutionIndicator(detected) {
        const indicator = document.getElementById('resolution-indicator');
        if (indicator) {
            indicator.textContent = `${detected.name.toUpperCase()} | ${detected.width}x${detected.height} | SCALE: ${Math.round(detected.config.scale * 100)}%`;
            // Keep hidden - functionality preserved for debugging
            console.log(`📺 Resolution Indicator: ${indicator.textContent}`);
        }
    }

    getCurrentResolution() {
        return this.currentResolution;
    }
}

// Create and export singleton
const displayManager = new DisplayManager();
window.displayManager = displayManager;

console.log("✅ Display Manager loaded");
