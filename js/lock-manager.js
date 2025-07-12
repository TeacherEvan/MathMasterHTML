// js/lock-manager.js - Unified Lock Animation Manager
console.log("LockManager loading...");

class LockManager {
    constructor(containerSelector = '#lock-display') {
        this.container = document.querySelector(containerSelector);
        this.lockIsLive = false;
        this.lockAnimationActive = false;
        this.currentLockLevel = 1;
        this.completedLinesCount = 0;
        
        // Bind event listeners
        this.initEventListeners();
        
        console.log('🔒 LockManager initialized');
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
                this.activateLockLevel(e.detail.stepIndex + 1);
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
        
        // Load the basic lock component first
        this.loadLockComponent('Line-1-transformer.html')
            .then(() => {
                console.log('🔒 Basic lock component loaded, activating...');
                setTimeout(() => {
                    this.activateLockLevel(1);
                }, 300);
            })
            .catch(error => {
                console.error('❌ Failed to load basic lock component:', error);
                this.showErrorLock();
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
            
            fetch(lockPath)
                .then(response => {
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
        
        // Apply level-specific activation
        lockBody.classList.add(`level-${level}-active`);
        
        // Trigger level-specific animations
        this.triggerLevelAnimation(lockBody, level);
        
        // Update progress indicators
        this.updateProgressIndicators(level);
    }
    
    progressLockLevel() {
        const newLevel = Math.min(6, this.completedLinesCount + 1);
        
        if (newLevel > this.currentLockLevel) {
            console.log(`🔒 Progressing to lock level ${newLevel}`);
            this.currentLockLevel = newLevel;
            
            // Load the new lock component
            this.loadLockComponent(`line-${newLevel}-transformer.html`)
                .then(() => {
                    setTimeout(() => {
                        this.activateLockLevel(newLevel);
                    }, 300);
                })
                .catch(error => {
                    console.error(`❌ Failed to load level ${newLevel} lock:`, error);
                    // Fallback to generic animation
                    this.activateLockLevel(newLevel);
                });
        }
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
        
        const rotation = (level - 1) * 15;
        const scaleAmount = 1 + (level * 0.15);
        lockBody.style.transform = `rotate(${rotation}deg) scale(${scaleAmount})`;
        
        const goldIntensity = Math.min(255, 150 + (level * 30));
        lockBody.style.background = `linear-gradient(145deg, #4a4a1a, rgb(${goldIntensity}, ${goldIntensity}, 42), #4a4a1a)`;
        lockBody.style.borderColor = `rgb(${goldIntensity}, ${goldIntensity}, 0)`;
        lockBody.style.boxShadow = `0 0 ${25 + level * 15}px rgba(255, 215, 0, 0.5)`;
    }
    
    triggerMasterAnimation(lockBody, level) {
        console.log(`� Triggering master level ${level} animation`);
        
        const rotation = (level - 1) * 20;
        const scaleAmount = 1 + (level * 0.2);
        const skew = (level - 1) * 5;
        lockBody.style.transform = `rotate(${rotation}deg) scale(${scaleAmount}) skewX(${skew}deg)`;
        
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
        
        if (this.container) {
            this.container.innerHTML = '<div class="lock-waiting">🔒 Lock will activate after first symbol reveal</div>';
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
