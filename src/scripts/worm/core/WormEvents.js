// worm/core/WormEvents.js - Centralized Event Definitions
// SOLID: Single Responsibility - Only defines event constants
(function() {
  "use strict";

  const WormEvents = {
    // Lifecycle Events
    WORM_SPAWNED: "worm:spawned",
    WORM_REMOVED: "worm:removed",
    WORM_EXPLODED: "worm:exploded",

    // Behavior Events
    BEHAVIOR_CHANGED: "worm:behavior:changed",
    TARGET_ACQUIRED: "worm:target:acquired",
    TARGET_LOST: "worm:target:lost",

    // Collision Events
    COLLISION_DETECTED: "worm:collision:detected",
    NEAR_MISS: "worm:nearMiss",
    SYMBOL_STOLEN: "worm:symbol:stolen",

    // Power-up Events
    POWERUP_DROPPED: "worm:powerup:dropped",
    POWERUP_COLLECTED: "worm:powerup:collected",
    POWERUP_USED: "worm:powerup:used",

    // State Events
    STATE_PUSH: "worm:state:push",
    STATE_POP: "worm:state:pop",

    // Animation Events
    ANIMATION_COMPLETE: "worm:animation:complete",
    EXPLOSION_EFFECT_COMPLETE: "worm:explosion:complete",
  };

  // Attach to window for global access
  window.WormEvents = WormEvents;

  console.log("✅ WormEvents module loaded");
})();
