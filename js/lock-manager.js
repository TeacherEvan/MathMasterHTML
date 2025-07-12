// js/lock-manager.js - Unified Lock Animation Manager
console.log("LockManager loading...");

class LockManager {
    constructor(containerSelector = '#lock-display') {
        this.container = document.querySelector(containerSelector);
        this.lockIsLive = false;
        this.lockAnimationActive = false;
        this.currentLockLevel = 1;
        this.completedLinesCount = 0;
        this.isLoadingComponent = false; // Prevent concurrent loading
        this.responsiveManager = null; // Will be set when responsive manager loads
        
        // Validation
        if (!this.container) {
            console.error(`❌ Lock container not found: ${containerSelector}`);
        }
        
        // Initialize with basic lock display
        this.showBasicLock();
        
        // Bind event listeners
        this.initEventListeners();
        
        // Wait for responsive manager to load
        this.initResponsiveIntegration();
        
        console.log('🔒 LockManager initialized with basic lock display');
    }
    
    initEventListeners() {
        // Listen for first-line-solved event
        document.addEventListener('first-line-solved', () => {
            console.log('🔒 LockManager received first-line-solved event');
            this.startLockAnimation();
        });
        
        // Listen for step completion events
        document.addEventListener('stepCompleted', (e) => {
            console.log('🔒 LockManager received stepCompleted event:', e.detail);
            if (this.lockAnimationActive) {
                // Only advance if we haven't reached this level yet
                const targetLevel = e.detail.stepIndex + 1;
                if (targetLevel > this.currentLockLevel && targetLevel <= 6) {
                    this.activateLockLevel(targetLevel);
                }
            }
        });
        
        // Listen for problem line completion
        document.addEventListener('problemLineCompleted', () => {
            console.log('🔒 LockManager received problemLineCompleted event');
            this.completedLinesCount++;
            this.progressLockLevel();
        });
    }
    
    
    startLockAnimation() {
        if (this.lockIsLive) {
            console.log('🔒 Lock animation already active, ignoring duplicate start');
            return;
        }
        
        console.log('🔒 Starting lock animation sequence');
        this.lockIsLive = true;
        this.lockAnimationActive = true;
        
        // Load the basic lock component first (using normalized naming)
        const componentName = this.normalizeComponentName(1);
        this.loadLockComponent(componentName)
            .then(() => {
                console.log('🔒 Basic lock component loaded, activating...');
                setTimeout(() => {
                    this.activateLockLevel(1);
                }, 300);
            })
            .catch(error => {
                console.error('❌ Failed to load basic lock component:', error);
                this.showErrorLock();
                // Reset state on error
                this.lockIsLive = false;
                this.lockAnimationActive = false;
            });
    }
    
    loadLockComponent(componentName) {
        return new Promise((resolve, reject) => {
            if (!this.container) {
                reject(new Error('Lock container not found'));
                return;
            }
            
            const lockPath = `lock-components/${componentName}`;
            console.log(`🔒 Loading lock component: ${lockPath}`);
            
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                reject(new Error(`Component loading timeout: ${componentName}`));
            }, 10000);
            
            fetch(lockPath)
                .then(response => {
                    clearTimeout(timeout);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${lockPath}: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(html => {
                    // Parse the HTML and extract content
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Extract styles from head
                    const styleElements = doc.head.querySelectorAll('style');
                    let styles = '';
                    styleElements.forEach(style => {
                        styles += style.outerHTML;
                    });
                    
                    // Extract body content
                    const bodyContent = doc.body.innerHTML;
                    
                    // Wrap content in lock-component-wrapper
                    const wrappedContent = `
                        ${styles}
                        <div class="lock-component-wrapper">
                            ${bodyContent}
                        </div>
                    `;
                    
                    // Insert into container
                    this.container.innerHTML = wrappedContent;
                    
                    console.log(`✅ Lock component ${componentName} loaded successfully`);
                    resolve();
                })
                .catch(error => {
                    clearTimeout(timeout);
                    console.error(`❌ Error loading lock component ${componentName}:`, error);
                    reject(error);
                });
        });
    }
    
    
    activateLockLevel(level) {
        console.log(`🔒 Activating lock level ${level}`);
        
        const lockBody = this.container.querySelector('.lock-body');
        if (!lockBody) {
            console.warn('⚠️ Lock body not found for activation');
            return;
        }
        
        // Remove any previous level-* classes
        for (let lvl = 1; lvl <= 6; lvl++) {
            lockBody.classList.remove(`level-${lvl}-active`);
        }
        // Apply level-specific activation and update state
        lockBody.classList.add(`level-${level}-active`);
        this.currentLockLevel = level;
        
        // Trigger level-specific animations
        this.triggerLevelAnimation(lockBody, level);
        
        // Update progress indicators
        this.updateProgressIndicators(level);
    }
    
    progressLockLevel() {
        if (this.isLoadingComponent) {
            console.log('🔒 Lock component already loading, skipping progression');
            return;
        }
        
        // Progress every 2 completed lines as documented
        const newLevel = Math.min(6, Math.floor(this.completedLinesCount / 2) + 1);
        
        if (newLevel > this.currentLockLevel) {
            console.log(`🔒 Progressing to lock level ${newLevel} (${this.completedLinesCount} lines completed)`);
            this.currentLockLevel = newLevel;
            this.isLoadingComponent = true;
            
            // Normalize component filename (handle inconsistent naming)
            const componentName = this.normalizeComponentName(newLevel);
            
            // Load the new lock component
            this.loadLockComponent(componentName)
                .then(() => {
                    setTimeout(() => {
                        this.activateLockLevel(newLevel);
                        this.isLoadingComponent = false;
                    }, 300);
                })
                .catch(error => {
                    console.error(`❌ Failed to load level ${newLevel} lock:`, error);
                    this.isLoadingComponent = false;
                    // Fallback to generic animation
                    this.activateLockLevel(newLevel);
                });
        }
    }
    
    normalizeComponentName(level) {
        // Handle inconsistent naming in component files
        const componentMap = {
            1: 'Line-1-transformer.html',
            2: 'line-2-transformer.html', 
            3: 'line-3-transformer.html',
            4: 'line-4-transformer.html',
            5: 'Line-5-transformer.html',
            6: 'line-6-transformer.html'
        };
        
        return componentMap[level] || `line-${level}-transformer.html`;
    }
    
    triggerLevelAnimation(lockBody, level) {
        console.log(`🎨 Triggering level ${level} animation`);
        
        switch (level) {
            case 1:
                this.triggerBeginnerAnimation(lockBody);
                break;
            case 2:
            case 3:
                this.triggerWarriorAnimation(lockBody, level);
                break;
            case 4:
            case 5:
            case 6:
                this.triggerMasterAnimation(lockBody, level);
                break;
            default:
                this.triggerGenericAnimation(lockBody, level);
        }
    }
    
    triggerBeginnerAnimation(lockBody) {
        console.log('� Triggering beginner level animation');
        
        // Scale and color progression
        const scaleAmount = 1.2;
        lockBody.style.transform = `scaleY(${scaleAmount})`;
        lockBody.style.background = 'linear-gradient(145deg, #1a4a1a, #2a6a2a, #1a4a1a)';
        lockBody.style.borderColor = '#0f0';
        lockBody.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.4)';
    }
    
    triggerWarriorAnimation(lockBody, level) {
        console.log(`🟡 Triggering warrior level ${level} animation`);
        
        // Remove rotation: scale only for warrior levels
        const scaleAmount = 1 + (level * 0.15);
        lockBody.style.transform = `scale(${scaleAmount})`;
        
        const goldIntensity = Math.min(255, 150 + (level * 30));
        lockBody.style.background = `linear-gradient(145deg, #4a4a1a, rgb(${goldIntensity}, ${goldIntensity}, 42), #4a4a1a)`;
        lockBody.style.borderColor = `rgb(${goldIntensity}, ${goldIntensity}, 0)`;
        lockBody.style.boxShadow = `0 0 ${25 + level * 15}px rgba(255, 215, 0, 0.5)`;
    }
    
    triggerMasterAnimation(lockBody, level) {
        console.log(`� Triggering master level ${level} animation`);
        
        // Remove rotation and skew: scale only for master levels
        const scaleAmount = 1 + (level * 0.2);
        lockBody.style.transform = `scale(${scaleAmount})`;
        
        const redIntensity = Math.min(255, 120 + (level * 35));
        lockBody.style.background = `linear-gradient(145deg, #4a1a1a, rgb(${redIntensity}, 42, 42), #4a1a1a)`;
        lockBody.style.borderColor = `rgb(${redIntensity}, 0, 0)`;
        lockBody.style.boxShadow = `0 0 ${30 + level * 20}px rgba(255, 0, 0, 0.6)`;
        
        // Add pulsing effect
        lockBody.style.animation = `lockPulse${level} 1s ease-in-out`;
    }
    
    triggerGenericAnimation(lockBody, level) {
        console.log(`⚪ Triggering generic level ${level} animation`);
        
        const scaleAmount = 1 + (level * 0.1);
        lockBody.style.transform = `scale(${scaleAmount})`;
        lockBody.style.filter = `brightness(${1 + level * 0.2})`;
    }
    
    updateProgressIndicators(level) {
        // Update any progress bars or indicators
        const progressBars = this.container.querySelectorAll('.progress-bar, .lock-progress');
        const totalLevels = 6;
        const progressPercentage = (level / totalLevels) * 100;
        
        progressBars.forEach(bar => {
            bar.style.width = `${progressPercentage}%`;
            bar.style.background = 'linear-gradient(90deg, #0f0, #090)';
            bar.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
        });
        
        // Update lock segments
        const segments = this.container.querySelectorAll('.lock-segment');
        segments.forEach((segment, index) => {
            if (index < level) {
                segment.classList.add('segment-active');
                segment.style.background = 'linear-gradient(45deg, #0f0, #090)';
                segment.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.6)';
            }
        });
    }
    
    showErrorLock() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="lock-error">
                    🔒 Lock Component Error
                    <br>
                    <small>Failed to load lock animation</small>
                </div>
            `;
        }
    }
    
    reset() {
        console.log('🔄 Resetting lock manager');
        this.lockIsLive = false;
        this.lockAnimationActive = false;
        this.currentLockLevel = 1;
        this.completedLinesCount = 0;
        this.isLoadingComponent = false;
        
        // Show basic lock instead of waiting message
        this.showBasicLock();
    }
    
    showBasicLock() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="lock-component-wrapper">
                    <div class="basic-lock-container">
                        <div class="basic-lock-shackle"></div>
                        <div class="basic-lock-body">
                            <div class="basic-lock-keyhole"></div>
                            <div class="basic-lock-bolts">
                                <div class="bolt bolt-1"></div>
                                <div class="bolt bolt-2"></div>
                                <div class="bolt bolt-3"></div>
                                <div class="bolt bolt-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    .basic-lock-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        transform-origin: center;
                        margin: 20px auto;
                        max-width: 100px;
                        max-height: 140px;
                    }
                    
                    .basic-lock-shackle {
                        width: 40px;
                        height: 30px;
                        border: 6px solid #666;
                        border-bottom: none;
                        border-radius: 20px 20px 0 0;
                        margin-bottom: 5px;
                        background: transparent;
                        box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
                    }
                    
                    .basic-lock-body {
                        width: 60px;
                        height: 80px;
                        background: linear-gradient(145deg, #2a2a2a, #404040);
                        border-radius: 8px;
                        position: relative;
                        border: 2px solid #555;
                        box-shadow: 
                            0 4px 8px rgba(0,0,0,0.3),
                            inset 0 0 5px rgba(0,0,0,0.2);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    
                    .basic-lock-keyhole {
                        width: 12px;
                        height: 12px;
                        background: #000;
                        border-radius: 50%;
                        position: relative;
                        border: 1px solid #333;
                    }
                    
                    .basic-lock-keyhole::after {
                        content: '';
                        position: absolute;
                        bottom: -6px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 4px;
                        height: 8px;
                        background: #000;
                        border: 1px solid #333;
                        border-top: none;
                    }
                    
                    .basic-lock-bolts {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                    }
                    
                    .bolt {
                        position: absolute;
                        width: 8px;
                        height: 8px;
                        background: #333;
                        border-radius: 50%;
                        box-shadow: inset 0 0 2px rgba(0,0,0,0.5);
                    }
                    
                    .bolt-1 { top: 10px; left: 10px; }
                    .bolt-2 { top: 10px; right: 10px; }
                    .bolt-3 { bottom: 10px; left: 10px; }
                    .bolt-4 { bottom: 10px; right: 10px; }
                </style>
            `;
        }
    }
    
    initResponsiveIntegration() {
        // Check if responsive manager is available
        if (window.lockResponsiveManager) {
            this.responsiveManager = window.lockResponsiveManager;
            console.log('🔗 LockManager connected to ResponsiveManager');
        } else {
            // Wait for responsive manager to load
            const checkForResponsiveManager = setInterval(() => {
                if (window.lockResponsiveManager) {
                    this.responsiveManager = window.lockResponsiveManager;
                    console.log('🔗 LockManager connected to ResponsiveManager (delayed)');
                    clearInterval(checkForResponsiveManager);
                }
            }, 100);
            
            // Stop checking after 5 seconds
            setTimeout(() => {
                clearInterval(checkForResponsiveManager);
            }, 5000);
        }
        
        // Listen for responsive scale changes
        document.addEventListener('lockScaleChanged', (e) => {
            console.log('🔒 LockManager received scale change:', e.detail);
            this.onScaleChanged(e.detail);
        });
    }
    
    onScaleChanged(scaleInfo) {
        // Adjust lock animations based on scale
        const { scale, resolution } = scaleInfo;
        
        if (this.container) {
            // Apply scale-specific adjustments
            this.container.style.setProperty('--lock-scale', scale);
            this.container.style.setProperty('--lock-container-scale', scale * 0.9);
            this.container.style.setProperty('--lock-body-scale', scale * 0.8);
            
            // Adjust animation timing for different scales
            if (scale < 0.6) {
                // Faster animations for smaller scales
                this.container.style.setProperty('--animation-duration', '0.8s');
            } else if (scale > 1.0) {
                // Slower animations for larger scales
                this.container.style.setProperty('--animation-duration', '1.5s');
            } else {
                // Normal animation duration
                this.container.style.setProperty('--animation-duration', '1.2s');
            }
            
            // Add resolution class for component-specific adjustments
            this.container.classList.remove('res-4k', 'res-1440p', 'res-1080p', 'res-720p', 'res-mobile');
            this.container.classList.add(`res-${resolution}`);
        }
    }
    
    // Public API methods
    isActive() {
        return this.lockIsLive;
    }
    
    getCurrentLevel() {
        return this.currentLockLevel;
    }
    
    getCompletedLines() {
        return this.completedLinesCount;
    }
    
    // Method to manually trigger lock animation for testing
    triggerLockAnimation() {
        if (!this.lockAnimationActive) {
            this.startLockAnimation();
        } else {
            this.progressLockLevel();
        }
    }
    
    // Debug method to get current state
    getDebugInfo() {
        return {
            lockIsLive: this.lockIsLive,
            lockAnimationActive: this.lockAnimationActive,
            currentLockLevel: this.currentLockLevel,
            completedLinesCount: this.completedLinesCount,
            isLoadingComponent: this.isLoadingComponent,
            containerExists: !!this.container
        };
    }
    
    // Method to force advance to specific level (for testing)
    forceLockLevel(level) {
        if (level < 1 || level > 6) {
            console.error('❌ Invalid lock level:', level);
            return;
        }
        
        console.log(`🔧 Force advancing to lock level ${level}`);
        this.currentLockLevel = level;
        this.completedLinesCount = (level - 1) * 2; // Update completed lines accordingly
        
        const componentName = this.normalizeComponentName(level);
        this.loadLockComponent(componentName)
            .then(() => {
                setTimeout(() => {
                    this.activateLockLevel(level);
                }, 300);
            })
            .catch(error => {
                console.error(`❌ Failed to force load level ${level}:`, error);
                this.activateLockLevel(level);
            });
    }
}

// Create and export singleton instance
const lockManager = new LockManager();

// Make available globally for game.js
window.lockManager = lockManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = lockManager;
}

console.log("✅ LockManager loaded and initialized");
