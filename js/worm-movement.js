// js/worm-movement.js - Worm Movement and Animation Logic
console.log("🎯 Worm Movement Module Loading...");

/**
 * WormMovement - Handles all worm movement, animation, and positioning logic
 * Extracted from WormSystem to separate concerns
 */
class WormMovement {
  /**
   * @param {Object} [config] - Movement configuration
   * @param {number} [config.borderMargin] - Distance from viewport edges
   * @param {number} [config.rushSpeedMultiplier] - Speed boost when rushing to target
   * @param {number} [config.flickerSpeedBoost] - Speed boost when carrying symbol
   * @param {number} [config.crawlAmplitude] - Inchworm effect amplitude
   * @param {number} [config.directionChangeRate] - Random direction change rate
   * @param {number} [config.crawlPhaseIncrement] - Crawl animation speed
   */
  constructor(config = {}) {
    this.BORDER_MARGIN = config.borderMargin || 20;
    this.RUSH_SPEED_MULTIPLIER = config.rushSpeedMultiplier || 2.0;
    this.FLICKER_SPEED_BOOST = config.flickerSpeedBoost || 1.2;
    this.CRAWL_AMPLITUDE = config.crawlAmplitude || 0.5;
    this.DIRECTION_CHANGE_RATE = config.directionChangeRate || 0.1;
    this.CRAWL_PHASE_INCREMENT = config.crawlPhaseIncrement || 0.05;

    // Distance thresholds
    this.DISTANCE_STEAL_SYMBOL = 30;
    this.DISTANCE_CONSOLE_ARRIVAL = 20;
    this.DISTANCE_TARGET_RUSH = 30;
    this.DISTANCE_ROAM_RESUME = 5;

    console.log("🎯 WormMovement initialized");
  }

  /**
   * Calculate velocity toward target position
   * @param {Object} worm - Worm data object
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @param {number} speedMultiplier - Speed multiplier (default: 1)
   * @returns {Object} {velocityX, velocityY, distance, direction}
   */
  calculateVelocityToTarget(worm, targetX, targetY, speedMultiplier = 1) {
    const dx = targetX - worm.x;
    const dy = targetY - worm.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return {
        velocityX: 0,
        velocityY: 0,
        distance: 0,
        direction: worm.direction || 0,
      };
    }

    const speed = worm.baseSpeed * speedMultiplier;

    return {
      velocityX: (dx / distance) * speed,
      velocityY: (dy / distance) * speed,
      distance: distance,
      direction: Math.atan2(dy, dx),
    };
  }

  /**
   * Apply boundary constraints to worm position
   * @param {Object} worm - Worm data object
   * @param {Object} bounds - {width, height, margin}
   */
  constrainToBounds(worm, bounds) {
    const { width, height, margin = this.BORDER_MARGIN } = bounds;

    // X boundaries with direction reversal
    if (worm.x < margin) {
      worm.x = margin;
      worm.direction = Math.PI - worm.direction;
    }
    if (worm.x > width - margin) {
      worm.x = width - margin;
      worm.direction = Math.PI - worm.direction;
    }

    // Y boundaries with direction reversal
    if (worm.y < margin) {
      worm.y = margin;
      worm.direction = -worm.direction;
    }
    if (worm.y > height - margin) {
      worm.y = height - margin;
      worm.direction = -worm.direction;
    }
  }

  /**
   * Update worm position based on velocity
   * @param {Object} worm - Worm data object
   */
  updatePosition(worm) {
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    // Apply crawl phase animation
    worm.crawlPhase += this.CRAWL_PHASE_INCREMENT;
    if (worm.crawlPhase > Math.PI * 2) {
      worm.crawlPhase -= Math.PI * 2;
    }
  }

  /**
   * Apply inchworm crawling effect
   * @param {Object} worm - Worm data object
   * @returns {Object} {x, y} adjusted position
   */
  applyCrawlEffect(worm) {
    const crawlOffset = Math.sin(worm.crawlPhase) * this.CRAWL_AMPLITUDE;

    return {
      x: worm.x + Math.cos(worm.direction + Math.PI / 2) * crawlOffset,
      y: worm.y + Math.sin(worm.direction + Math.PI / 2) * crawlOffset,
    };
  }

  /**
   * Update worm roaming behavior
   * @param {Object} worm - Worm data object
   */
  updateRoaming(worm) {
    // Random direction changes for organic movement
    if (Math.random() < this.DIRECTION_CHANGE_RATE) {
      worm.direction += ((Math.random() - 0.5) * Math.PI) / 4;
    }

    // Update velocity based on direction
    worm.velocityX = Math.cos(worm.direction) * worm.currentSpeed;
    worm.velocityY = Math.sin(worm.direction) * worm.currentSpeed;
  }

  /**
   * Update worm rushing to target
   * @param {Object} worm - Worm data object
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @returns {number} Distance to target
   */
  updateRushing(worm, targetX, targetY) {
    const result = this.calculateVelocityToTarget(
      worm,
      targetX,
      targetY,
      this.RUSH_SPEED_MULTIPLIER,
    );

    worm.velocityX = result.velocityX;
    worm.velocityY = result.velocityY;
    worm.direction = result.direction;

    return result.distance;
  }

  /**
   * Update worm element transform in DOM
   * @param {Object} worm - Worm data object
   */
  updateElementTransform(worm) {
    if (!worm.element) return;

    const { x, y } = this.applyCrawlEffect(worm);

    // Calculate rotation angle in degrees
    const rotationDeg = (worm.direction * 180) / Math.PI + 90;

    // Apply transform (position + rotation)
    worm.element.style.left = `${x}px`;
    worm.element.style.top = `${y}px`;
    worm.element.style.transform = `rotate(${rotationDeg}deg)`;
  }

  /**
   * Check if worm reached target position
   * @param {Object} worm - Worm data object
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @param {number} threshold - Distance threshold for "reached"
   * @returns {boolean} True if reached
   */
  hasReachedTarget(worm, targetX, targetY, threshold) {
    const dx = targetX - worm.x;
    const dy = targetY - worm.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < threshold;
  }

  /**
   * Check if worm is inside a rectangle
   * @param {Object} worm - Worm data object
   * @param {DOMRect} rect - Rectangle bounds
   * @returns {boolean} True if inside
   */
  isInsideRect(worm, rect) {
    return (
      worm.x >= rect.left &&
      worm.x <= rect.right &&
      worm.y >= rect.top &&
      worm.y <= rect.bottom
    );
  }

  /**
   * Calculate distance between two points
   * @param {number} x1 - Point 1 X
   * @param {number} y1 - Point 1 Y
   * @param {number} x2 - Point 2 X
   * @param {number} y2 - Point 2 Y
   * @returns {number} Distance
   */
  calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Find closest element from a list
   * @param {Object} worm - Worm data object
   * @param {Array<HTMLElement>} elements - List of elements
   * @returns {Object|null} {element, distance, rect} or null
   */
  findClosestElement(worm, elements) {
    if (!elements || elements.length === 0) return null;

    let closest = null;
    let minDistance = Infinity;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = this.calculateDistance(worm.x, worm.y, centerX, centerY);

      if (distance < minDistance) {
        minDistance = distance;
        closest = {
          element: element,
          distance: distance,
          rect: rect,
          centerX: centerX,
          centerY: centerY,
        };
      }
    }

    return closest;
  }
}

// Export for use in other modules or attach to window
if (typeof module !== "undefined" && module.exports) {
  module.exports = WormMovement;
} else {
  window.WormMovement = WormMovement;
}

console.log("✅ Worm Movement Module Loaded");
