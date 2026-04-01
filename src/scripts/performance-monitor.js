// js/performance-monitor.js - Real-time Performance Monitoring Overlay
console.log("📊 Performance Monitor Loading...");

class PerformanceMonitor {
  constructor() {
    this.frameTimings = [];
    this.lastFrameTime = performance.now();
    this.fps = 60;
    this.domQueryCount = 0;
    this.lastReportTime = performance.now();
    this.lastDomQueriesPerSec = 0;
    this.overlay = null;

    // Extended histogram: rolling buffer of last 300 frame deltas (~5s at 60fps)
    this._histogramBuffer = [];
    this._histogramSize = 300;

    // Input-latency tracking
    this._inputLatencyBuffer = [];
    this._inputLatencySize = 50;
    this._pendingClickTimestamp = null;

    console.log("📊 Performance Monitor initialized");
  }

  init() {
    // Create overlay HTML
    this.createOverlay();

    // Wrap querySelectorAll to count DOM queries
    this.wrapDOMQueries();

    // Start FPS monitoring
    this.startFPSMonitoring();

    // Input-latency tracking (only when extended instrumentation is on)
    this._initInputLatencyTracking();

    console.log("✅ Performance Monitor active");
  }

  /** @private */
  _isExtendedEnabled() {
    return (
      typeof window !== "undefined" && window.__PERF_INSTRUMENTATION === true
    );
  }

  /** @private */
  _initInputLatencyTracking() {
    document.addEventListener("symbolClicked", (e) => {
      if (!this._isExtendedEnabled()) return;
      this._pendingClickTimestamp = e.timeStamp ?? performance.now();
    });
    document.addEventListener("symbolRevealed", () => {
      if (!this._isExtendedEnabled()) return;
      if (this._pendingClickTimestamp !== null) {
        const latency = performance.now() - this._pendingClickTimestamp;
        this._inputLatencyBuffer.push(latency);
        if (this._inputLatencyBuffer.length > this._inputLatencySize) {
          this._inputLatencyBuffer.shift();
        }
        this._pendingClickTimestamp = null;
      }
    });
  }

  /**
   * Return a structured performance snapshot for programmatic consumption.
   * Works in both lightweight and extended modes.
   * @returns {object}
   */
  destroy() {
    this._destroyed = true;
    console.log("📊 PerformanceMonitor destroyed");
  }

  getSnapshot() {
    const buf = this._isExtendedEnabled()
      ? this._histogramBuffer
      : this.frameTimings;
    const sorted = buf.length > 0 ? [...buf].sort((a, b) => a - b) : [16.67];
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;
    const max = sorted[sorted.length - 1] ?? avg;
    const jankCount = sorted.filter((d) => d > 50).length;
    const jankPercent =
      sorted.length > 0 ? (jankCount / sorted.length) * 100 : 0;

    // Frame budget violation: frames exceeding 16.67ms (60fps budget)
    const budgetViolations = sorted.filter((d) => d > 16.67).length;
    const frameBudgetViolationPercent =
      sorted.length > 0
        ? Math.round((budgetViolations / sorted.length) * 100 * 100) / 100
        : 0;

    // DOM node count
    const domNodeCount = document.querySelectorAll("*").length;

    // Input latency stats
    let inputLatencyAvg = null;
    let inputLatencyP95 = null;
    if (this._inputLatencyBuffer.length > 0) {
      const ilSorted = [...this._inputLatencyBuffer].sort((a, b) => a - b);
      inputLatencyAvg =
        Math.round(
          (ilSorted.reduce((a, b) => a + b, 0) / ilSorted.length) * 10,
        ) / 10;
      inputLatencyP95 =
        Math.round(
          (ilSorted[Math.floor(ilSorted.length * 0.95)] ?? inputLatencyAvg) *
            10,
        ) / 10;
    }

    // Entity counts
    let activeWorms = 0;
    if (window.wormSystem && window.wormSystem.worms) {
      activeWorms = window.wormSystem.worms.filter((w) => w.active).length;
    }
    let rainSymbols = 0;
    if (typeof window.symbolRainActiveCount === "number") {
      rainSymbols = window.symbolRainActiveCount;
    } else if (typeof window.getActiveSymbolCount === "function") {
      const count = window.getActiveSymbolCount();
      if (typeof count === "number" && Number.isFinite(count)) {
        rainSymbols = count;
      }
    }

    const elapsedSinceLastReport = Math.max(
      1,
      performance.now() - this.lastReportTime,
    );
    const currentDomQueryRate = Math.round(
      (this.domQueryCount / elapsedSinceLastReport) * 1000,
    );
    const domQueriesPerSec =
      currentDomQueryRate > 0 ? currentDomQueryRate : this.lastDomQueriesPerSec;

    return {
      fps: this.fps,
      frameTimeAvg: Math.round(avg * 100) / 100,
      frameTimeP95: Math.round(p95 * 100) / 100,
      frameTimeMax: Math.round(max * 100) / 100,
      jankPercent: Math.round(jankPercent * 100) / 100,
      frameBudgetViolationPercent,
      domNodeCount,
      domQueriesPerSec,
      activeWorms,
      rainSymbols,
      inputLatencyAvg,
      inputLatencyP95,
      resourceManagerStats: window.ResourceManager?.getStats?.() ?? null,
      sampleCount: sorted.length,
      timestamp: Date.now(),
    };
  }

  createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "perf-monitor";
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

    element.style.pointerEvents = "auto";
    element.style.cursor = "move";

    element.addEventListener("mousedown", (e) => {
      isDragging = true;
      initialX = e.clientX - element.offsetLeft;
      initialY = e.clientY - element.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        element.style.left = currentX + "px";
        element.style.top = currentY + "px";
        element.style.right = "auto";
      }
    });

    document.addEventListener("mouseup", () => {
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

    console.log("🔍 DOM query tracking enabled");
  }

  startFPSMonitoring() {
    const self = this;

    function measureFrame() {
      if (self._destroyed) return;
      const now = performance.now();
      const delta = now - self.lastFrameTime;
      self.lastFrameTime = now;

      // Calculate FPS (short window for overlay display)
      self.frameTimings.push(delta);
      if (self.frameTimings.length > 60) {
        self.frameTimings.shift();
      }

      // Extended histogram buffer (~5s at 60fps) for getSnapshot() P95/jank
      if (self._isExtendedEnabled()) {
        self._histogramBuffer.push(delta);
        if (self._histogramBuffer.length > self._histogramSize) {
          self._histogramBuffer.shift();
        }
      }

      const avgDelta =
        self.frameTimings.reduce((a, b) => a + b, 0) / self.frameTimings.length;
      self.fps = Math.round(1000 / avgDelta);

      // Update overlay every 500ms
      if (now - self.lastReportTime > 500) {
        self.updateOverlay(avgDelta, now - self.lastReportTime);
        self.lastReportTime = now;
      }

      requestAnimationFrame(measureFrame);
    }

    measureFrame();
  }

  updateOverlay(frameTime, elapsedMs = 500) {
    const fpsElement = document.getElementById("perf-fps");
    const domElement = document.getElementById("perf-dom");
    const wormsElement = document.getElementById("perf-worms");
    const symbolsElement = document.getElementById("perf-symbols");
    const frametimeElement = document.getElementById("perf-frametime");

    if (!fpsElement) return;

    // Update FPS with color coding
    const fps = this.fps;
    fpsElement.textContent = fps;
    if (fps >= 55) {
      fpsElement.style.color = "#0f0"; // Green - good
    } else if (fps >= 30) {
      fpsElement.style.color = "#ff0"; // Yellow - warning
    } else {
      fpsElement.style.color = "#f00"; // Red - critical
    }

    // Update DOM queries per second
    const queriesPerSec = Math.round(
      (this.domQueryCount / Math.max(elapsedMs, 1)) * 1000,
    );
    this.lastDomQueriesPerSec = queriesPerSec;
    domElement.textContent = queriesPerSec;
    if (queriesPerSec < 200) {
      domElement.style.color = "#0f0";
    } else if (queriesPerSec < 500) {
      domElement.style.color = "#ff0";
    } else {
      domElement.style.color = "#f00";
    }
    this.domQueryCount = 0; // Reset counter

    // Update worm count
    if (window.wormSystem && window.wormSystem.worms) {
      const activeWorms = window.wormSystem.worms.filter(
        (w) => w.active,
      ).length;
      wormsElement.textContent = activeWorms;
      if (activeWorms <= 5) {
        wormsElement.style.color = "#0f0";
      } else if (activeWorms <= 7) {
        wormsElement.style.color = "#ff0";
      } else {
        wormsElement.style.color = "#f00";
      }
    }

    // Update symbol count (if accessible)
    if (typeof window.symbolRainActiveCount === "number") {
      symbolsElement.textContent = window.symbolRainActiveCount;
    } else if (typeof window.getActiveSymbolCount === "function") {
      const activeSymbolCount = window.getActiveSymbolCount();
      if (typeof activeSymbolCount === "number") {
        symbolsElement.textContent = activeSymbolCount;
      }
    }

    // Update frame time
    const frameTimeMs = Math.round(frameTime);
    frametimeElement.textContent = frameTimeMs;
    if (frameTimeMs <= 16) {
      frametimeElement.style.color = "#0f0"; // 60+ FPS
    } else if (frameTimeMs <= 33) {
      frametimeElement.style.color = "#ff0"; // 30-60 FPS
    } else {
      frametimeElement.style.color = "#f00"; // < 30 FPS
    }
  }

  toggle() {
    if (this.overlay) {
      this.overlay.style.display =
        this.overlay.style.display === "none" ? "block" : "none";
    }
  }
}

window.PerformanceMonitor = PerformanceMonitor;

// Bootstrap moved to performance-monitor.bootstrap.js
