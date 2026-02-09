// js/performance-monitor.js - Real-time Performance Monitoring Overlay
console.log("📊 Performance Monitor Loading...");

class PerformanceMonitor {
    constructor() {
        this.frameTimings = [];
        this.lastFrameTime = performance.now();
        this.fps = 60;
        this.domQueryCount = 0;
        this.lastReportTime = Date.now();
        this.overlay = null;

        console.log('📊 Performance Monitor initialized');
    }

    init() {
        // Create overlay HTML
        this.createOverlay();

        // Wrap querySelectorAll to count DOM queries
        this.wrapDOMQueries();

        // Start FPS monitoring
        this.startFPSMonitoring();

        console.log('✅ Performance Monitor active');
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'perf-monitor';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            padding: 10px 15px;
            border: 2px solid #0f0;
            border-radius: 8px;
            font-family: 'Orbitron', monospace;
            font-size: 12px;
            z-index: 100000;
            min-width: 200px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
            user-select: none;
            pointer-events: none;
            display: none;
        `;

        overlay.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 8px; color: #0ff; font-size: 14px;">⚡ PERFORMANCE</div>
            <div style="margin-bottom: 4px;">
                <span style="color: #888;">FPS:</span> 
                <span id="perf-fps" style="color: #0f0; font-weight: 700;">60</span>
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #888;">DOM Queries:</span> 
                <span id="perf-dom" style="color: #0f0;">0</span><span style="color: #666;">/sec</span>
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #888;">Active Worms:</span> 
                <span id="perf-worms" style="color: #0f0;">0</span>
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #888;">Rain Symbols:</span> 
                <span id="perf-symbols" style="color: #0f0;">0</span>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #0f0;">
                <span style="color: #888;">Frame Time:</span> 
                <span id="perf-frametime" style="color: #0f0;">16</span><span style="color: #666;">ms</span>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;

        // Make it draggable
        this.makeDraggable(overlay);
    }

    makeDraggable(element) {
        let isDragging = false;
        let currentX, currentY, initialX, initialY;

        element.style.pointerEvents = 'auto';
        element.style.cursor = 'move';

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - element.offsetLeft;
            initialY = e.clientY - element.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';
                element.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    wrapDOMQueries() {
        const self = this;

        // Wrap querySelectorAll
        const originalQSA = Document.prototype.querySelectorAll;
        Document.prototype.querySelectorAll = function (...args) {
            self.domQueryCount++;
            return originalQSA.apply(this, args);
        };

        // Wrap querySelector
        const originalQS = Document.prototype.querySelector;
        Document.prototype.querySelector = function (...args) {
            self.domQueryCount++;
            return originalQS.apply(this, args);
        };

        console.log('🔍 DOM query tracking enabled');
    }

    startFPSMonitoring() {
        const self = this;

        function measureFrame() {
            const now = performance.now();
            const delta = now - self.lastFrameTime;
            self.lastFrameTime = now;

            // Calculate FPS
            self.frameTimings.push(delta);
            if (self.frameTimings.length > 60) {
                self.frameTimings.shift();
            }

            const avgDelta = self.frameTimings.reduce((a, b) => a + b, 0) / self.frameTimings.length;
            self.fps = Math.round(1000 / avgDelta);

            // Update overlay every 500ms
            if (now - self.lastReportTime > 500) {
                self.updateOverlay(avgDelta);
                self.lastReportTime = now;
            }

            requestAnimationFrame(measureFrame);
        }

        measureFrame();
    }

    updateOverlay(frameTime) {
        const fpsElement = document.getElementById('perf-fps');
        const domElement = document.getElementById('perf-dom');
        const wormsElement = document.getElementById('perf-worms');
        const symbolsElement = document.getElementById('perf-symbols');
        const frametimeElement = document.getElementById('perf-frametime');

        if (!fpsElement) return;

        // Update FPS with color coding
        const fps = this.fps;
        fpsElement.textContent = fps;
        if (fps >= 55) {
            fpsElement.style.color = '#0f0'; // Green - good
        } else if (fps >= 30) {
            fpsElement.style.color = '#ff0'; // Yellow - warning
        } else {
            fpsElement.style.color = '#f00'; // Red - critical
        }

        // Update DOM queries per second
        const queriesPerSec = Math.round((this.domQueryCount / 0.5));
        domElement.textContent = queriesPerSec;
        if (queriesPerSec < 200) {
            domElement.style.color = '#0f0';
        } else if (queriesPerSec < 500) {
            domElement.style.color = '#ff0';
        } else {
            domElement.style.color = '#f00';
        }
        this.domQueryCount = 0; // Reset counter

        // Update worm count
        if (window.wormSystem && window.wormSystem.worms) {
            const activeWorms = window.wormSystem.worms.filter(w => w.active).length;
            wormsElement.textContent = activeWorms;
            if (activeWorms <= 5) {
                wormsElement.style.color = '#0f0';
            } else if (activeWorms <= 7) {
                wormsElement.style.color = '#ff0';
            } else {
                wormsElement.style.color = '#f00';
            }
        }

        // Update symbol count (if accessible)
        if (window.symbolRainActiveCount !== undefined) {
            symbolsElement.textContent = window.symbolRainActiveCount;
        }

        // Update frame time
        const frameTimeMs = Math.round(frameTime);
        frametimeElement.textContent = frameTimeMs;
        if (frameTimeMs <= 16) {
            frametimeElement.style.color = '#0f0'; // 60+ FPS
        } else if (frameTimeMs <= 33) {
            frametimeElement.style.color = '#ff0'; // 30-60 FPS
        } else {
            frametimeElement.style.color = '#f00'; // < 30 FPS
        }
    }

    toggle() {
        if (this.overlay) {
            this.overlay.style.display = this.overlay.style.display === 'none' ? 'block' : 'none';
        }
    }
}

// Bootstrap moved to performance-monitor.bootstrap.js
