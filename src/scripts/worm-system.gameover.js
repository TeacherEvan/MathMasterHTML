// src/scripts/worm-system.gameover.js - Game Over Detection and UI
// Extracted from worm-system.behavior.js to separate game-over concerns from steal behavior
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for game-over helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  // ========================================
  // GAME OVER DETECTION
  // ========================================

  /**
   * Check if all symbols have been stolen (game over condition)
   * Queries ALL symbol elements to determine if any remain available
   */
  proto.checkGameOverCondition = function() {
    // FIX: Query ALL symbol elements (not just revealed ones) because stolen symbols may not be in .revealed-symbol class
    // We need to check both revealed and hidden symbols to see if they're stolen
    const allSymbols = this.solutionContainer.querySelectorAll(
      ".symbol:not(.space-symbol):not(.completed-row-symbol)",
    );

    const availableSymbols = Array.from(allSymbols).filter((el) => {
      const isStolen = el.dataset.stolen === "true";
      const isSpace = el.classList.contains("space-symbol");
      const isCompleted = el.classList.contains("completed-row-symbol");

      // Symbol is available if it's not stolen, not a space, and not from a completed row
      return !isStolen && !isSpace && !isCompleted;
    });

    console.log(
      `🎮 Game Over Check: ${availableSymbols.length} symbols available out of ${allSymbols.length} total`,
    );

    if (availableSymbols.length === 0 && allSymbols.length > 0) {
      console.log("💀 GAME OVER! All symbols stolen!");
      this.triggerGameOver();
    }
  };

  // ========================================
  // GAME OVER SEQUENCE
  // ========================================

  /**
   * Trigger game over sequence - pause animations, apply penalty, show UI
   */
  proto.triggerGameOver = function() {
    // Pause worm animations
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove a random console symbol as penalty (if any exist)
    this.removeRandomConsoleSymbol();

    // Show Game Over modal
    this.showGameOverModal();
  };

  // ========================================
  // PENALTY SYSTEM
  // ========================================

  /**
   * Remove random symbol from console as penalty for game over
   * Modifies consoleManager state directly
   */
  proto.removeRandomConsoleSymbol = function() {
    if (!window.consoleManager) return;

    const filledSlots = [];
    window.consoleManager.slots.forEach((symbol, index) => {
      if (symbol !== null) {
        filledSlots.push(index);
      }
    });

    if (filledSlots.length === 0) {
      console.log("⚠️ No console symbols to remove");
      return;
    }

    // Pick random filled slot
    const randomIndex =
      filledSlots[Math.floor(Math.random() * filledSlots.length)];
    const removedSymbol = window.consoleManager.slots[randomIndex];

    // Remove it
    window.consoleManager.slots[randomIndex] = null;
    window.consoleManager.updateConsoleDisplay();
    window.consoleManager.saveProgress();

    console.log(
      `💔 PENALTY: Removed "${removedSymbol}" from console slot ${randomIndex +
        1}`,
    );
  };

  // ========================================
  // GAME OVER UI
  // ========================================

  /**
   * Show Game Over modal with retry/back options
   * Creates modal DOM element on first call, caches for subsequent calls
   */
  proto.showGameOverModal = function() {
    // PERFORMANCE: Use cached element or create if doesn't exist
    let modal =
      this.cachedGameOverModal || document.getElementById("game-over-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "game-over-modal";
      modal.className = "game-over-modal";
      modal.innerHTML = `
                <div class="game-over-content">
                    <h1 class="game-over-title">💀 GAME OVER! 💀</h1>
                    <p class="game-over-message">All symbols have been stolen by worms!</p>
                    <p class="game-over-penalty">Penalty: Lost 1 console symbol</p>
                    <button class="game-over-button" onclick="location.reload()">Try Again</button>
                    <button class="game-over-button secondary" onclick="window.location.href='level-select.html'">Back to Levels</button>
                </div>
            `;
      document.body.appendChild(modal);
      this.cachedGameOverModal = modal; // Cache the newly created modal
    }

    // Show modal with animation
    setTimeout(() => {
      modal.style.display = "flex";
      modal.style.opacity = "1";
    }, 100);
  };
})();
