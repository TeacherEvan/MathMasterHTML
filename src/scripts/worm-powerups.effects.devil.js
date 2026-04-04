(function () {
  window.WormPowerUpEffects = window.WormPowerUpEffects || {};

  window.WormPowerUpEffects.applyDevilEffects = function (proto) {
    proto._executeDevil = function (x, y) {
      this.spawnDevil(x, y);
    };

    proto.activateDevil = function () {
      console.log("👹 DEVIL ACTIVATED! Click location to spawn devil...");

      const handlePlacement = (e) => {
        if (e.type === "click" && e.detail !== 0) {
          return;
        }

        if (typeof e.button === "number" && e.button !== 0) {
          return;
        }

        e.preventDefault();
        this.spawnDevil(e.clientX, e.clientY);
        document.removeEventListener("pointerdown", handlePlacement);
        document.removeEventListener("click", handlePlacement);
        document.body.style.cursor = "";
      };

      document.addEventListener("pointerdown", handlePlacement);
      document.addEventListener("click", handlePlacement);
      document.body.style.cursor = "crosshair";
    };

    proto.spawnDevil = function (x, y) {
      const devil = document.createElement("div");
      devil.className = "devil-entity";
      devil.textContent = "👹";
      devil.style.cssText = `
            position: fixed;
            font-size: 60px;
            z-index: 10001;
            pointer-events: none;
            text-shadow: 0 0 20px red;
        will-change: translate, transform, opacity;
        `;
      devil.style.translate = `${x}px ${y}px`;

      this.wormSystem.crossPanelContainer.appendChild(devil);

      const devilData = {
        x: x,
        y: y,
        wormProximity: new Map(),
        createdAt: Date.now(),
        duration: 10000,
        fading: false,
      };

      const checkProximity = () => {
        const now = Date.now();
        const timeAlive = now - devilData.createdAt;

        if (timeAlive > devilData.duration) {
          if (devil.parentNode) {
            devil.parentNode.removeChild(devil);
          }
          console.log("👹 Devil removed - 10s timeout reached");
          return;
        }

        // Apply refresh rate fade effect in last 2 seconds
        if (timeAlive > devilData.duration - 2000 && !devilData.fading) {
          devil.style.animation = "power-up-fade 2s ease-out";
          devilData.fading = true;
        }

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
                  `👹 Devil killed worm ${worm.id} after ${
                    this.DEVIL_KILL_TIME / 1000
                  }s proximity!`,
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

        if (activeWorms.length > 0 || timeAlive <= devilData.duration) {
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

  window.WormPowerUpEffectsRegistry.devil = function (system, payload) {
    system._executeDevil(payload.x, payload.y);
  };
})();
