// src/scripts/worm-system.powerups.effects.devil.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for devil effects");
    return;
  }

  const proto = window.WormSystem.prototype;

  // Devil: Click location to spawn devil, worms rush to it and die after 5s proximity
  proto.activateDevil = function() {
    console.log("👹 DEVIL ACTIVATED! Click location to spawn devil...");

    // One-time click listener
    const handleDevilClick = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      console.log(`👹 Devil spawning at (${x}, ${y})`);

      this.spawnDevil(x, y);

      // Remove listener and reset cursor
      document.removeEventListener("click", handleDevilClick);
      document.body.style.cursor = "";
    };

    document.addEventListener("click", handleDevilClick);
    document.body.style.cursor = "crosshair";
  };

  proto.spawnDevil = function(x, y) {
    const devil = document.createElement("div");
    devil.textContent = "👹";
    devil.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 60px;
            z-index: 10001;
            pointer-events: none;
            animation: devil-pulsate 1.5s ease-in-out infinite;
        `;

    this.crossPanelContainer.appendChild(devil);

    // Track worms near devil
    const devilData = {
      x: x,
      y: y,
      wormProximity: new Map(), // Track how long each worm has been near
    };

    const checkProximity = () => {
      const activeWorms = this.worms.filter((w) => w.active);

      activeWorms.forEach((worm) => {
        const dist = Math.sqrt(
          Math.pow(worm.x - devilData.x, 2) + Math.pow(worm.y - devilData.y, 2),
        );

        if (dist < this.DEVIL_PROXIMITY_DISTANCE) {
          // Worm is near devil
          if (!devilData.wormProximity.has(worm.id)) {
            devilData.wormProximity.set(worm.id, Date.now());
          } else {
            const timeNear = Date.now() - devilData.wormProximity.get(worm.id);
            if (timeNear >= this.DEVIL_KILL_TIME) {
              // Worm has been near for 5 seconds - kill it!
              console.log(`👹 Worm ${worm.id} killed by devil (5s proximity)`);

              // Create skull emoji
              const skull = document.createElement("div");
              skull.textContent = "💀";
              skull.style.cssText = `
                                position: fixed;
                                left: ${worm.x}px;
                                top: ${worm.y}px;
                                font-size: 30px;
                                z-index: 10002;
                                pointer-events: none;
                            `;
              this.crossPanelContainer.appendChild(skull);

              setTimeout(() => {
                if (skull.parentNode) {
                  skull.parentNode.removeChild(skull);
                }
              }, this.SKULL_DISPLAY_DURATION);

              this.explodeWorm(worm, false);
              devilData.wormProximity.delete(worm.id);
            }
          }

          // Make worm rush toward devil (override normal behavior)
          worm.isRushingToDevil = true;
          worm.devilX = devilData.x;
          worm.devilY = devilData.y;
        } else {
          // Worm left proximity
          if (devilData.wormProximity.has(worm.id)) {
            devilData.wormProximity.delete(worm.id);
          }
          worm.isRushingToDevil = false;
        }
      });

      if (activeWorms.length > 0) {
        requestAnimationFrame(checkProximity);
      } else {
        // No more worms, remove devil
        if (devil.parentNode) {
          devil.parentNode.removeChild(devil);
        }
      }
    };

    checkProximity();
  };
})();
