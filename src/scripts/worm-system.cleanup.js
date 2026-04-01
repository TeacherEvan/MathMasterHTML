// src/scripts/worm-system.cleanup.js
(function () {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for cleanup helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  proto.removeWorm = function (wormData) {
    const index = this.worms.indexOf(wormData);
    if (index > -1) {
      this.worms.splice(index, 1);
    }

    // Unlock console slot if worm was spawned from console
    if (wormData.fromConsole && wormData.consoleSlotIndex !== undefined) {
      this.lockedConsoleSlots.delete(wormData.consoleSlotIndex);
      if (wormData.consoleSlotElement) {
        wormData.consoleSlotElement.classList.remove("worm-spawning", "locked");
      }
      console.log(`🔓 Console slot ${wormData.consoleSlotIndex + 1} unlocked`);
    }

    if (wormData.element && wormData.element.parentNode) {
      wormData.element.parentNode.removeChild(wormData.element);
    }

    wormData.element = null;
    wormData.consoleSlotElement = null;

    if (this.worms.length === 0 && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log(
      `🐛 Worm ${wormData.id} removed. Active worms: ${this.worms.length}`,
    );
  };

  proto.killAllWorms = function () {
    console.log(
      `💀 KILLING ALL WORMS! Total worms to kill: ${this.worms.length}`,
    );

    if (this.spawnManager?.clearQueue) {
      this.spawnManager.clearQueue();
    }

    // Create a copy of the worms array to iterate over
    const wormsToKill = [...this.worms];

    // Explode each worm with a slight delay for dramatic effect
    wormsToKill.forEach((worm, index) => {
      setTimeout(() => {
        if (worm.active) {
          console.log(`💥 Exploding worm ${worm.id}`);
          this.explodeWorm(worm);
        }
      }, index * 100); // 100ms delay between each explosion
    });

    console.log(`✅ All worms scheduled for extermination!`);
  };

  proto.reset = function () {
    console.log("🐛 Resetting worm system");

    if (this.spawnManager?.clearQueue) {
      this.spawnManager.clearQueue();
    }

    // Clear spawn timer
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = null;
    }

    // Reset spawn flag
    this.firstWormSpawned = false;

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove all worms
    this.worms.forEach((worm) => {
      if (worm.element && worm.element.parentNode) {
        worm.element.parentNode.removeChild(worm.element);
      }
    });

    this.worms = [];

    // Remove event listeners to prevent leaks
    const cleanupSelf = /** @type {{ removeEventListeners?: (() => void) }} */ (
      this
    );
    if (typeof cleanupSelf.removeEventListeners === "function") {
      cleanupSelf.removeEventListeners();
    }

    // Clear stolen flags from symbols
    if (this.solutionContainer) {
      const stolenSymbols =
        this.solutionContainer.querySelectorAll("[data-stolen]");
      stolenSymbols.forEach((el) => {
        el.style.visibility = "visible";
        el.classList.remove("stolen");
        delete el.dataset.stolen;
      });
    }
  };
})();
