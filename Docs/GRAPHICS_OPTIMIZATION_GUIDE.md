# Graphics & Animation Optimization Guide - Math Master

**Created**: January 26, 2026  
**Status**: Implementation Ready  
**Target**: 60 FPS desktop, 50+ FPS mobile with enhanced visuals

---

## Executive Summary

This guide documents advanced techniques for optimizing and enhancing gameplay graphics while maintaining performance across all platforms. The recommendations balance visual fidelity with resource constraints.

### Current Performance Baseline

| Metric          | Desktop  | Mobile   | Target        |
| --------------- | -------- | -------- | ------------- |
| FPS             | 58-60 ✅ | 45-50 ✅ | 60 / 50+      |
| Frame Time      | 15-17ms  | 18-22ms  | <16ms / <20ms |
| DOM Queries/sec | 80-120   | 100-140  | <150          |
| Memory Growth   | 2MB/min  | 3MB/min  | <5MB/min      |

---

## Table of Contents

1. [Quality Tier Detection System](#1-quality-tier-detection-system)
2. [CSS Containment Strategy](#2-css-containment-strategy)
3. [Level-of-Detail (LOD) Animation System](#3-level-of-detail-lod-animation-system)
4. [Enhanced Reduced-Motion Support](#4-enhanced-reduced-motion-support)
5. [Intersection Observer Animation Control](#5-intersection-observer-animation-control)
6. [Dynamic FPS-Based Quality Adjustment](#6-dynamic-fps-based-quality-adjustment)
7. [GPU-Optimized CSS Patterns](#7-gpu-optimized-css-patterns)
8. [Particle Effect Optimization](#8-particle-effect-optimization)

---

## 1. Quality Tier Detection System

### Purpose

Automatically detect device capabilities and apply appropriate graphics settings.

### Implementation: `src/scripts/quality-tier-manager.js`

```javascript
/**
 * Quality Tier Manager - Adaptive Graphics Quality
 * Detects device capabilities and applies appropriate settings
 */
class QualityTierManager {
  static TIERS = {
    HIGH: "high", // High-end desktop, gaming devices
    MEDIUM: "medium", // Standard desktop, modern tablets
    LOW: "low", // Mobile, older devices
    ULTRA_LOW: "ultra-low", // Very low-end, battery saver
  };

  constructor() {
    this.currentTier = this.detectTier();
    this.settings = this.getSettingsForTier(this.currentTier);
    this.applySettings();
    console.log(`🎮 Quality Tier: ${this.currentTier.toUpperCase()}`);
  }

  detectTier() {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4; // GB
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const connection = navigator.connection?.effectiveType || "4g";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Score-based detection
    let score = 0;
    score += cores >= 8 ? 3 : cores >= 4 ? 2 : cores >= 2 ? 1 : 0;
    score += memory >= 8 ? 3 : memory >= 4 ? 2 : memory >= 2 ? 1 : 0;
    score += isMobile ? -1 : 1;
    score += connection === "4g" ? 1 : connection === "3g" ? 0 : -1;
    score += prefersReducedMotion ? -2 : 0;

    if (score >= 6) return QualityTierManager.TIERS.HIGH;
    if (score >= 3) return QualityTierManager.TIERS.MEDIUM;
    if (score >= 0) return QualityTierManager.TIERS.LOW;
    return QualityTierManager.TIERS.ULTRA_LOW;
  }

  getSettingsForTier(tier) {
    const settings = {
      [QualityTierManager.TIERS.HIGH]: {
        particleCount: 15,
        wormSpawnRate: 1.0,
        shadowsEnabled: true,
        blurEffects: true,
        animationComplexity: "full",
        symbolRainDensity: 1.0,
        glowIntensity: 1.0,
      },
      [QualityTierManager.TIERS.MEDIUM]: {
        particleCount: 10,
        wormSpawnRate: 0.8,
        shadowsEnabled: true,
        blurEffects: false,
        animationComplexity: "standard",
        symbolRainDensity: 0.8,
        glowIntensity: 0.7,
      },
      [QualityTierManager.TIERS.LOW]: {
        particleCount: 5,
        wormSpawnRate: 0.6,
        shadowsEnabled: false,
        blurEffects: false,
        animationComplexity: "simplified",
        symbolRainDensity: 0.6,
        glowIntensity: 0.4,
      },
      [QualityTierManager.TIERS.ULTRA_LOW]: {
        particleCount: 2,
        wormSpawnRate: 0.4,
        shadowsEnabled: false,
        blurEffects: false,
        animationComplexity: "minimal",
        symbolRainDensity: 0.4,
        glowIntensity: 0.2,
      },
    };
    return settings[tier];
  }

  applySettings() {
    const root = document.documentElement;
    const s = this.settings;

    // CSS Custom Properties for quality scaling
    root.style.setProperty("--quality-particle-count", s.particleCount);
    root.style.setProperty("--quality-glow-intensity", s.glowIntensity);
    root.style.setProperty(
      "--quality-shadow-enabled",
      s.shadowsEnabled ? 1 : 0,
    );
    root.style.setProperty("--quality-blur-enabled", s.blurEffects ? 1 : 0);

    // Apply tier class to body
    document.body.dataset.qualityTier = this.currentTier;

    // Dispatch event for other modules
    document.dispatchEvent(
      new CustomEvent("qualityTierChanged", {
        detail: { tier: this.currentTier, settings: s },
      }),
    );
  }

  // Allow manual override
  setTier(tier) {
    if (QualityTierManager.TIERS[tier.toUpperCase()]) {
      this.currentTier = tier.toLowerCase();
      this.settings = this.getSettingsForTier(this.currentTier);
      this.applySettings();
    }
  }
}

// Initialize and export
window.QualityTierManager = QualityTierManager;
window.qualityManager = new QualityTierManager();
```

---

## 2. CSS Containment Strategy

### Purpose

Isolate layout recalculations to prevent cascading performance issues.

### Implementation: Add to `game.css`

```css
/* ============================================
   CSS CONTAINMENT - Layout Isolation
   Prevents layout thrashing between panels
   ============================================ */

/* Panel A: Problem Display */
.panel-a,
#problem-display {
  contain: layout paint;
}

/* Panel B: Solution Steps & Worms */
.panel-b,
#solution-steps-container {
  contain: layout paint style;
}

/* Panel C: Symbol Rain - Strict containment */
#symbol-rain-container {
  contain: strict;
  /* Note: strict = size + layout + paint + style */
}

/* Worm elements - Isolated from main layout */
.worm-entity {
  contain: layout paint;
}

/* Lock animation container */
.lock-container {
  contain: layout paint;
  content-visibility: auto;
  contain-intrinsic-size: 200px 300px;
}

/* Falling symbols - Paint containment only */
.falling-symbol {
  contain: paint;
}

/* Modal overlays - Full isolation */
.modal-overlay,
.game-modal {
  contain: strict;
}
```

### Benefits

- **Layout Isolation**: Changes in Panel C don't trigger recalc in Panel A/B
- **Paint Containment**: Offscreen content skipped during paint
- **Style Scoping**: Counter/quote effects don't leak between panels

---

## 3. Level-of-Detail (LOD) Animation System

### Purpose

Reduce animation complexity based on quality tier and current FPS.

### CSS Implementation: `src/styles/css/lod-animations.css`

```css
/* ============================================
   LOD ANIMATION SYSTEM
   Complexity scales with quality tier
   ============================================ */

/* HIGH TIER - Full effects */
[data-quality-tier="high"] .falling-symbol {
  text-shadow: 0 0 5px currentColor, 0 0 10px currentColor,
    0 0 20px currentColor;
  filter: none;
}

[data-quality-tier="high"] .worm-entity {
  filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
}

[data-quality-tier="high"] @keyframes pulsating-cyan {
  0%,
  100% {
    text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00d4ff;
  }
  50% {
    text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00d4ff;
  }
}

/* MEDIUM TIER - Reduced glow layers */
[data-quality-tier="medium"] .falling-symbol {
  text-shadow: 0 0 8px currentColor;
}

[data-quality-tier="medium"] .worm-entity {
  filter: drop-shadow(0 0 5px rgba(0, 255, 0, 0.6));
}

/* LOW TIER - Minimal effects */
[data-quality-tier="low"] .falling-symbol {
  text-shadow: 0 0 3px currentColor;
}

[data-quality-tier="low"] .worm-entity {
  filter: none;
}

[data-quality-tier="low"] .explosion-particle {
  display: none; /* Skip particle effects entirely */
}

/* ULTRA-LOW TIER - Essential animations only */
[data-quality-tier="ultra-low"] .falling-symbol {
  text-shadow: none;
  animation: none !important;
}

[data-quality-tier="ultra-low"] .worm-entity {
  filter: none;
  animation-duration: 0s !important;
}

[data-quality-tier="ultra-low"] .explosion-particle,
[data-quality-tier="ultra-low"] .slime-splat,
[data-quality-tier="ultra-low"] .explosion-flash {
  display: none !important;
}
```

---

## 4. Enhanced Reduced-Motion Support

### Purpose

Comprehensive accessibility for users who prefer reduced motion.

### CSS Implementation: Add to `modern-ux-enhancements.css`

```css
/* ============================================
   ENHANCED REDUCED-MOTION SUPPORT
   Full accessibility compliance
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  /* Disable all keyframe animations */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  /* Keep essential visual feedback */
  .revealed-symbol {
    color: #ff0000;
    background: rgba(255, 0, 0, 0.2);
  }

  .completed-row-symbol {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.2);
  }

  /* Static alternatives for animated elements */
  .falling-symbol {
    opacity: 1;
    text-shadow: 0 0 5px currentColor;
  }

  /* Disable particle effects */
  .explosion-particle,
  .explosion-flash,
  .slime-splat {
    display: none !important;
  }

  /* Static lock display */
  .lock-container * {
    animation: none !important;
  }

  /* Worms move but don't animate */
  .worm-entity {
    transition: transform 0.3s linear !important;
  }

  /* Screen shake disabled */
  .screen-shake {
    animation: none !important;
  }
}
```

### JavaScript Detection

```javascript
// Add to ux-enhancements.js or quality-tier-manager.js
function checkReducedMotion() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (prefersReduced.matches) {
    document.body.classList.add("reduced-motion");
    console.log("♿ Reduced motion enabled");
  }

  // Listen for changes
  prefersReduced.addEventListener("change", (e) => {
    document.body.classList.toggle("reduced-motion", e.matches);
  });
}
```

---

## 5. Intersection Observer Animation Control

### Purpose

Pause animations for off-screen elements to save resources.

### Implementation: `src/scripts/animation-visibility-controller.js`

```javascript
/**
 * Animation Visibility Controller
 * Pauses animations for off-screen elements
 */
class AnimationVisibilityController {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    if (!("IntersectionObserver" in window)) {
      console.warn("IntersectionObserver not supported");
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => this.handleVisibilityChange(entries),
      {
        root: null,
        rootMargin: "50px", // Pre-load slightly before visible
        threshold: 0,
      },
    );

    // Observe animated containers
    this.observeContainers();
    console.log("👁️ Animation Visibility Controller active");
  }

  observeContainers() {
    const containers = [
      "#symbol-rain-container",
      "#solution-steps-container",
      ".lock-container",
    ];

    containers.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.dataset.animationState = "running";
        this.observer.observe(el);
      }
    });
  }

  handleVisibilityChange(entries) {
    entries.forEach((entry) => {
      const el = entry.target;

      if (entry.isIntersecting) {
        // Element is visible - resume animations
        el.dataset.animationState = "running";
        el.style.animationPlayState = "running";
        this.resumeChildAnimations(el);
      } else {
        // Element is off-screen - pause animations
        el.dataset.animationState = "paused";
        el.style.animationPlayState = "paused";
        this.pauseChildAnimations(el);
      }
    });
  }

  pauseChildAnimations(container) {
    const animated = container.querySelectorAll('[class*="animate"]');
    animated.forEach((el) => {
      el.style.animationPlayState = "paused";
    });
  }

  resumeChildAnimations(container) {
    const animated = container.querySelectorAll('[class*="animate"]');
    animated.forEach((el) => {
      el.style.animationPlayState = "running";
    });
  }
}

window.AnimationVisibilityController = AnimationVisibilityController;
```

---

## 6. Dynamic FPS-Based Quality Adjustment

### Purpose

Automatically reduce quality when FPS drops below threshold.

### Implementation: Extend `performance-monitor.js`

```javascript
/**
 * Dynamic Quality Adjuster
 * Real-time quality scaling based on FPS
 */
class DynamicQualityAdjuster {
  constructor(performanceMonitor) {
    this.monitor = performanceMonitor;
    this.adjustmentCooldown = false;
    this.fpsHistory = [];
    this.FPS_THRESHOLD_LOW = 30;
    this.FPS_THRESHOLD_RECOVER = 55;
    this.HISTORY_SIZE = 30; // ~0.5 seconds at 60fps

    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => this.checkAndAdjust(), 1000);
  }

  checkAndAdjust() {
    if (this.adjustmentCooldown) return;

    const currentFps = this.monitor.fps;
    this.fpsHistory.push(currentFps);

    if (this.fpsHistory.length > this.HISTORY_SIZE) {
      this.fpsHistory.shift();
    }

    const avgFps =
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // Sustained low FPS - reduce quality
    if (avgFps < this.FPS_THRESHOLD_LOW && window.qualityManager) {
      this.reduceQuality();
    }

    // Sustained high FPS - can increase quality
    if (avgFps > this.FPS_THRESHOLD_RECOVER && window.qualityManager) {
      this.tryIncreaseQuality();
    }
  }

  reduceQuality() {
    const tiers = ["high", "medium", "low", "ultra-low"];
    const currentIndex = tiers.indexOf(window.qualityManager.currentTier);

    if (currentIndex < tiers.length - 1) {
      window.qualityManager.setTier(tiers[currentIndex + 1]);
      console.log(`⬇️ Quality reduced to: ${tiers[currentIndex + 1]}`);
      this.setCooldown();
    }
  }

  tryIncreaseQuality() {
    const tiers = ["high", "medium", "low", "ultra-low"];
    const currentIndex = tiers.indexOf(window.qualityManager.currentTier);
    const detectedTier = window.qualityManager.detectTier();
    const detectedIndex = tiers.indexOf(detectedTier);

    // Only increase if below detected capability
    if (currentIndex > 0 && currentIndex > detectedIndex) {
      window.qualityManager.setTier(tiers[currentIndex - 1]);
      console.log(`⬆️ Quality increased to: ${tiers[currentIndex - 1]}`);
      this.setCooldown();
    }
  }

  setCooldown() {
    this.adjustmentCooldown = true;
    this.fpsHistory = []; // Reset history
    setTimeout(() => {
      this.adjustmentCooldown = false;
    }, 5000); // 5 second cooldown
  }
}
```

---

## 7. GPU-Optimized CSS Patterns

### Best Practices Applied

```css
/* ============================================
   GPU-OPTIMIZED ANIMATION PATTERNS
   ============================================ */

/* ✅ DO: Use transform and opacity only */
.optimized-animation {
  transform: translateX(0);
  opacity: 1;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.optimized-animation:hover {
  transform: translateX(10px) scale(1.05);
  opacity: 0.9;
}

/* ✅ DO: Specific transition properties */
.good-transition {
  transition: transform 0.3s ease, opacity 0.3s ease, color 0.2s ease;
}

/* ❌ DON'T: transition: all */
/* .bad-transition { transition: all 0.3s; } */

/* ✅ DO: will-change for known animations */
.will-animate-soon {
  will-change: transform;
}

/* Remove will-change after animation */
.animation-complete {
  will-change: auto;
}

/* ✅ DO: Use translateZ(0) for GPU layer hint */
.force-gpu-layer {
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* ✅ DO: Avoid layout-triggering properties */
/* Good: transform: translateX() instead of left/margin-left */
/* Good: transform: scale() instead of width/height */
```

---

## 8. Particle Effect Optimization

### Reduced Particle System

```javascript
/**
 * Optimized Particle System
 * Scales particle count based on quality tier
 */
class OptimizedParticleSystem {
  constructor() {
    this.pool = [];
    this.maxParticles = this.getMaxParticles();
    this.initPool();

    // Listen for quality changes
    document.addEventListener("qualityTierChanged", (e) => {
      this.maxParticles = this.getMaxParticles();
    });
  }

  getMaxParticles() {
    const tier = window.qualityManager?.currentTier || "medium";
    const counts = {
      high: 15,
      medium: 10,
      low: 5,
      "ultra-low": 2,
    };
    return counts[tier];
  }

  initPool() {
    // Pre-create particle elements
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement("div");
      particle.className = "explosion-particle";
      particle.style.display = "none";
      this.pool.push({
        element: particle,
        inUse: false,
      });
    }
  }

  createExplosion(x, y, count = null) {
    const particleCount = Math.min(
      count || this.maxParticles,
      this.maxParticles,
    );

    for (let i = 0; i < particleCount; i++) {
      const particle = this.getFromPool();
      if (!particle) break;

      this.animateParticle(particle, x, y, i);
    }
  }

  getFromPool() {
    return this.pool.find((p) => !p.inUse);
  }

  animateParticle(poolItem, x, y, index) {
    const el = poolItem.element;
    poolItem.inUse = true;

    const angle = (index / this.maxParticles) * Math.PI * 2;
    const distance = 50 + Math.random() * 50;

    el.style.cssText = `
            display: block;
            left: ${x}px;
            top: ${y}px;
            --angle-x: ${Math.cos(angle) * distance};
            --angle-y: ${Math.sin(angle) * distance};
        `;

    document.body.appendChild(el);

    // Return to pool after animation
    setTimeout(() => {
      el.style.display = "none";
      el.remove();
      poolItem.inUse = false;
    }, 600);
  }
}
```

---

## Performance Testing Checklist

- [ ] Test with `?fps=1` to simulate low FPS
- [ ] Test on mobile device (Chrome DevTools throttling)
- [ ] Test with `prefers-reduced-motion` enabled
- [ ] Verify quality tier auto-detection
- [ ] Check memory usage over 5-minute session
- [ ] Profile with Chrome DevTools Performance tab
- [ ] Verify no layout thrashing (check "Rendering" in DevTools)

---

## Implementation Priority

1. **HIGH**: CSS Containment (Section 2) - Immediate performance gain
2. **HIGH**: Quality Tier Detection (Section 1) - Foundation for other systems
3. **MEDIUM**: LOD Animations (Section 3) - Scalable visual quality
4. **MEDIUM**: Reduced-Motion Support (Section 4) - Accessibility compliance
5. **LOW**: Dynamic FPS Adjustment (Section 6) - Real-time optimization
6. **LOW**: Intersection Observer (Section 5) - Edge case optimization

---

## Related Documentation

- [PERFORMANCE.md](PERFORMANCE.md) - Existing optimization patterns
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design overview
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Coding standards
