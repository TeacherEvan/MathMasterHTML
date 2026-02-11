// src/scripts/worm-system.powerups.effects.chain.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for chain lightning effects");
    return;
  }

  const proto = window.WormSystem.prototype;

  // Chain Lightning: Click worm to kill 5 + nearby worms
  proto.activateChainLightning = function() {
    console.log(
      "⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash the power!",
    );

    // Calculate kill count (5 for first use, then +2 for each subsequent use)
    const killCount = this.chainLightningKillCount;
    console.log(`⚡ Will kill ${killCount} worms in proximity`);

    // Set up one-time click listener on worms
    const handleWormClickForLightning = (e, worm) => {
      e.stopPropagation();
      console.log(`⚡ Chain Lightning targeting worm ${worm.id}!`);

      // Find closest worms
      const sortedWorms = this.worms
        .filter((w) => w.active)
        .sort((a, b) => {
          const distA = Math.sqrt(
            Math.pow(a.x - worm.x, 2) + Math.pow(a.y - worm.y, 2),
          );
          const distB = Math.sqrt(
            Math.pow(b.x - worm.x, 2) + Math.pow(b.y - worm.y, 2),
          );
          return distA - distB;
        })
        .slice(0, killCount);

      console.log(
        `⚡ Killing ${sortedWorms.length} worms with chain lightning!`,
      );

      // Visual effect
      sortedWorms.forEach((targetWorm, index) => {
        setTimeout(() => {
          // Lightning bolt effect
          const bolt = document.createElement("div");
          bolt.style.cssText = `
                        position: fixed;
                        left: ${worm.x}px;
                        top: ${worm.y}px;
                        width: 3px;
                        height: ${Math.sqrt(
                          Math.pow(targetWorm.x - worm.x, 2) +
                            Math.pow(targetWorm.y - worm.y, 2),
                        )}px;
                        background: linear-gradient(180deg, #fff, #0ff, #fff);
                        transform-origin: top left;
                        transform: rotate(${Math.atan2(
                          targetWorm.y - worm.y,
                          targetWorm.x - worm.x,
                        ) +
                          Math.PI / 2}rad);
                        z-index: 10003;
                        box-shadow: 0 0 10px #0ff, 0 0 20px #0ff;
                        pointer-events: none;
                    `;
          document.body.appendChild(bolt);

          setTimeout(() => {
            if (bolt.parentNode) bolt.parentNode.removeChild(bolt);
          }, 200);

          // Explode worm
          this.explodeWorm(targetWorm, false);
        }, index * 100);
      });

      // RESET: Count resets when used (back to 5 for next collection)
      this.chainLightningKillCount = 5;

      // Remove temporary listeners
      this.worms.forEach((w) => {
        if (w.element && w.tempLightningHandler) {
          w.element.removeEventListener("click", w.tempLightningHandler);
          delete w.tempLightningHandler;
        }
      });

      // Reset cursor
      document.body.style.cursor = "";
    };

    // Add temporary click listeners to all worms
    this.worms.forEach((w) => {
      if (w.active && w.element) {
        w.tempLightningHandler = (e) => handleWormClickForLightning(e, w);
        w.element.addEventListener("click", w.tempLightningHandler);
      }
    });

    // Change cursor to indicate power-up is active
    document.body.style.cursor = "crosshair";
  };
})();
