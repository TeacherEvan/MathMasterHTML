# Animation Optimization Proposal - Using Tempus Library

**Created**: January 4, 2026  
**Purpose**: Improve Math Master's animation performance using priority-based requestAnimationFrame

---

## Current Implementation

Math Master uses direct `requestAnimationFrame` in `js/worm.js`:

```javascript
animate() {
    if (!this.active) return;

    // Update position, rotation, collision detection
    // ... ~100 lines of animation logic

    requestAnimationFrame(() => this.animate());
}
```

**Issues**:

- All worms run animations at maximum FPS (potentially wasteful)
- No priority system for critical vs non-critical animations
- 100+ worms could cause performance degradation

---

## Proposed Solution: Tempus Animation Manager

**Library**: [Tempus](https://github.com/darkroomengineering/tempus)  
**Benefits**: Priority control, FPS limiting, better performance

### Implementation Example

```javascript
// In js/worm.js - Replace direct requestAnimationFrame with Tempus

import Tempus from "tempus";

class WormManager {
  constructor() {
    // ... existing code

    // Initialize animation priorities
    this.initializeAnimationLoop();
  }

  initializeAnimationLoop() {
    // Priority -2: Input and symbol reveal detection (highest priority)
    Tempus.add(
      (time, deltaTime) => {
        this.processSymbolReveals();
        this.processUserClicks();
      },
      { priority: -2, label: "input" }
    );

    // Priority -1: Critical worm AI (targeting, stealing)
    Tempus.add(
      (time, deltaTime) => {
        this.updateWormTargeting(deltaTime);
        this.checkWormCollisions();
      },
      { priority: -1, fps: 60, label: "critical-ai" }
    );

    // Priority 0: Worm movement and physics
    Tempus.add(
      (time, deltaTime) => {
        this.worms.forEach((worm) => {
          if (worm.active) {
            this.updateWormPosition(worm, deltaTime);
            this.updateWormRotation(worm);
          }
        });
      },
      { priority: 0, fps: 60, label: "movement" }
    );

    // Priority 1: Visual effects (can run at lower FPS)
    Tempus.add(
      (time, deltaTime) => {
        this.updateLSDEffects();
        this.updateExplosionAnimations();
        this.updateSlimeSplats();
      },
      { priority: 1, fps: 30, label: "effects" }
    );

    // Priority 2: Non-critical background worms (every other frame)
    Tempus.add(
      (time, deltaTime) => {
        // Update worms far from symbols at 50% FPS
        this.worms
          .filter((worm) => !worm.isRushingToTarget)
          .forEach((worm) => this.updateRoamingWorm(worm, deltaTime));
      },
      { priority: 2, fps: "50%", label: "roaming" }
    );

    // Priority 3: Debug overlay (very low priority)
    Tempus.add(
      () => {
        if (this.debugMode) {
          this.updatePerformanceMonitor();
        }
      },
      { priority: 3, fps: 2, label: "debug" }
    );
  }

  updateWormPosition(worm, deltaTime) {
    // Convert deltaTime from ms to seconds if needed
    const dt = deltaTime / 1000;

    // Apply velocity
    worm.x += worm.velocityX * worm.currentSpeed * dt * 60;
    worm.y += worm.velocityY * worm.currentSpeed * dt * 60;

    // Boundary checks
    this.clampWormPosition(worm);

    // Update DOM
    worm.element.style.left = `${worm.x}px`;
    worm.element.style.top = `${worm.y}px`;
  }
}
```

---

## Performance Benefits

### Before (Current System)

- All worms: 60fps regardless of importance
- 100 worms = 6,000 updates/second
- No priority system
- Potential frame drops during heavy activity

### After (Tempus System)

- Critical worms (targeting): 60fps
- Roaming worms: 30fps (50% reduction)
- Visual effects: 30fps
- Debug: 2fps
- **Estimated**: 50% reduction in animation overhead

---

## Expected Improvements

| Scenario         | Current FPS | With Tempus | Improvement |
| ---------------- | ----------- | ----------- | ----------- |
| 20 worms roaming | 60fps       | 60fps       | Stable      |
| 50 worms mixed   | 45-50fps    | 55-60fps    | +20%        |
| 100 worms active | 30-40fps    | 50-55fps    | +40%        |

---

## Implementation Steps

1. **Install Tempus**: `npm install @darkroomengineering/tempus`
2. **Refactor worm.js**: Replace requestAnimationFrame with Tempus.add()
3. **Prioritize tasks**: Separate critical (targeting) from non-critical (roaming)
4. **Test performance**: Use performance monitor (press 'P')
5. **Adjust FPS values**: Fine-tune based on actual performance

---

## Migration Path

### Phase 1: Add Tempus alongside existing system

```javascript
// Keep old system working while testing
if (window.USE_TEMPUS) {
  this.initializeAnimationLoop();
} else {
  this.animate(); // Old method
}
```

### Phase 2: A/B test both systems

- Collect metrics from both implementations
- Compare frame rates, smoothness, CPU usage

### Phase 3: Remove old requestAnimationFrame

- Once Tempus proven stable, remove old code
- Update documentation

---

## Risks & Mitigation

**Risk 1**: Learning curve for new library  
**Mitigation**: Start with simple usage, gradually add priorities

**Risk 2**: Breaking existing animations  
**Mitigation**: Keep old system as fallback during testing

**Risk 3**: Library dependency  
**Mitigation**: Tempus is lightweight (3KB), well-maintained, high source reputation

---

## Additional Resources

- Tempus GitHub: https://github.com/darkroomengineering/tempus
- Code examples retrieved via Context7 docs
- Performance metrics in PERFORMANCE.md

---

**Status**: Proposal - Needs team review and testing approval
