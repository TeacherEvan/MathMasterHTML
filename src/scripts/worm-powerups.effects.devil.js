(function() {
  window.WormPowerUpEffects = window.WormPowerUpEffects || {};

  window.WormPowerUpEffects.applyDevilEffects = function(proto) {
    proto._executeDevil = function(x, y) {
      this.spawnDevil(x, y);
    };

    proto.activateDevil = function() {
      console.log("👹 DEVIL ACTIVATED! Click location to spawn devil...");

      const handleClick = (e) => {
        this.spawnDevil(e.clientX, e.clientY);
        document.removeEventListener("click", handleClick);
        document.body.style.cursor = "";
      };

      document.addEventListener("click", handleClick);
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
            text-shadow: 0 0 20px red;
        `;

      this.wormSystem.crossPanelContainer.appendChild(devil);

      const devilData = {
        x: x,
        y: y,
        wormProximity: new Map(),
      };

      const checkProximity = () => {
        const activeWorms = this.wormSystem.worms.filter((w) => w.active);

        activeWorms.forEach((worm) => {
          const dist = calculateDistance(
            worm.x,
            worm.y,
            devilData.x,
            devilData.y,
          );

          if (dist < this.DEVIL_PROXIMITY_DISTANCE) {
            if (!devilData.wormProximity.has(worm.id)) {
              devilData.wormProximity.set(worm.id, Date.now());
              console.log(`👹 Worm ${worm.id} attracted to devil`);
            } else {
              const timeNear =
                Date.now() - devilData.wormProximity.get(worm.id);
              if (timeNear >= this.DEVIL_KILL_TIME) {
                console.log(
                  `👹 Devil killed worm ${worm.id} after ${this
                    .DEVIL_KILL_TIME / 1000}s proximity!`,
                );
                this.wormSystem.explodeWorm(worm, false, false);
                devilData.wormProximity.delete(worm.id);
              }
            }

            worm.isRushingToDevil = true;
            worm.devilX = devilData.x;
            worm.devilY = devilData.y;
          } else {
            if (devilData.wormProximity.has(worm.id)) {
              console.log(`👹 Worm ${worm.id} escaped devil proximity`);
              devilData.wormProximity.delete(worm.id);
            }
            worm.isRushingToDevil = false;
          }
        });

        if (activeWorms.length > 0) {
          requestAnimationFrame(checkProximity);
        } else {
          if (devil.parentNode) {
            devil.parentNode.removeChild(devil);
          }
          console.log("👹 Devil removed - no more worms");
        }
      };

      checkProximity();
    };
  };

  if (!window.WormPowerUpEffectsRegistry) {
    window.WormPowerUpEffectsRegistry = {};
  }

  window.WormPowerUpEffectsRegistry.devil = function(system, payload) {
    system._executeDevil(payload.x, payload.y);
  };
})();
