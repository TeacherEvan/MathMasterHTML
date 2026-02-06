// js/worm-powerups.js - Power-Up System for Worm Game
console.log("✨ Power-Up System Loading...");

/**
 * Manages all power-up logic including drop, collection, and activation
 * Extracted from WormSystem to improve maintainability
 *
 * TWO-CLICK SYSTEM:
 * 1. First click on power-up icon = SELECT (highlight, ready for placement)
 * 2. Second click on game area = PLACE/ACTIVATE the power-up
 * 3. Click same icon again = DESELECT (cancel selection)
 * 4. ESC key = DESELECT any selected power-up
 */
class WormPowerUpSystem {
  constructor(wormSystem) {
    this.wormSystem = wormSystem;

    // Inventory tracking
    this.inventory = {
      chainLightning: 0,
      spider: 0,
      devil: 0,
    };

    // TWO-CLICK SYSTEM: Selection state
    this.selectedPowerUp = null; // Currently selected power-up type
    this.isPlacementMode = false; // Whether waiting for placement click
    this.placementHandler = null; // Stored handler for cleanup

    // Chain lightning progression
    this.chainLightningKillCount = 5; // First use kills 5, then +2 per collection

    // UI element cache
    this.displayElement = null;

    // Constants
    this.DROP_RATE = 0.1; // 10% chance to drop power-up
    this.TYPES = ["chainLightning", "spider", "devil"];
    this.EMOJIS = {
      chainLightning: "⚡",
      spider: "🕷️",
      devil: "👹",
    };
    this.DESCRIPTIONS = {
      chainLightning: "Click a worm to chain-kill nearby worms",
      spider: "Click to spawn spider that converts worms",
      devil: "Click to place devil magnet that attracts worms",
    };

    // Timing constants
    this.SLIME_SPLAT_DURATION = 10000; // ms - power-up lifetime
    this.SPIDER_HEART_DURATION = 60000; // ms - 1 minute
    this.SKULL_DISPLAY_DURATION = 10000; // ms - 10 seconds
    this.DEVIL_PROXIMITY_DISTANCE = 50; // px
    this.DEVIL_KILL_TIME = 5000; // ms - 5 seconds near devil

    // Setup ESC key handler for deselection
    this._setupKeyboardHandler();

    if (typeof this._bindUIEventHandlers === "function") {
      this._bindUIEventHandlers();
    }

    console.log("✨ Power-Up System initialized (Two-Click Mode enabled)");
  }
}

// Export for use in worm.js
window.WormPowerUpSystem = WormPowerUpSystem;
console.log("✅ WormPowerUpSystem class exported to window");
