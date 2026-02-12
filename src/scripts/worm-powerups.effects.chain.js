(function() {
  window.WormPowerUpEffects = window.WormPowerUpEffects || {};

  window.WormPowerUpEffects.applyChainEffects = function(proto) {
    if (window.WormPowerUpEffects.applyChainTargeting) {
      window.WormPowerUpEffects.applyChainTargeting(proto);
    }

    if (window.WormPowerUpEffects.applyChainVisuals) {
      window.WormPowerUpEffects.applyChainVisuals(proto);
    }

    proto._executeChainLightning = function(x, y, event) {
      const clickedWorm = this._findWormAtPosition(x, y);

      if (clickedWorm) {
        this._chainLightningFromWorm(clickedWorm);
      } else {
        const nearestWorm = this._findNearestWorm(x, y);
        if (nearestWorm) {
          this._chainLightningFromWorm(nearestWorm);
        } else {
          console.log("⚠️ No worms to target!");
          this.inventory.chainLightning++;
          this._showTooltip("No worms to target!", "warning");
          this._dispatchInventoryChanged();
        }
      }
    };

    proto._chainLightningFromWorm = function(worm) {
      const killCount = this.chainLightningKillCount;
      console.log(
        `⚡ Chain Lightning targeting worm ${worm.id}! Will kill ${killCount} worms`,
      );

      const sortedWorms = this._getChainLightningTargets
        ? this._getChainLightningTargets(worm, killCount)
        : this.wormSystem.worms
            .filter((w) => w.active)
            .sort((a, b) => {
              const distA = calculateDistance(a.x, a.y, worm.x, worm.y);
              const distB = calculateDistance(b.x, b.y, worm.x, worm.y);
              return distA - distB;
            })
            .slice(0, killCount);

      console.log(
        `⚡ Killing ${sortedWorms.length} worms with chain lightning!`,
      );

      sortedWorms.forEach((targetWorm, index) => {
        setTimeout(() => {
          if (targetWorm.active) {
            this.createLightningBolt(
              worm.x,
              worm.y,
              targetWorm.x,
              targetWorm.y,
            );
            this.wormSystem.createExplosionFlash("#00ffff");
            this.wormSystem.explodeWorm(targetWorm, false, true);
          }
        }, index * 100);
      });

      this.chainLightningKillCount = 5;
      this._dispatchInventoryChanged();
    };

    proto.activateChainLightning = function() {
      console.log("⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash!");

      const killCount = this.chainLightningKillCount;
      console.log(`⚡ Will kill ${killCount} worms in proximity`);

      const handleWormClick = (e, worm) => {
        e.stopPropagation();
        console.log(`⚡ Chain Lightning targeting worm ${worm.id}!`);

        this._chainLightningFromWorm(worm);

        this.wormSystem.worms.forEach((w) => {
          if (w.element && w.tempLightningHandler) {
            w.element.removeEventListener("click", w.tempLightningHandler);
            delete w.tempLightningHandler;
          }
        });

        document.body.style.cursor = "";
      };

      this.wormSystem.worms.forEach((w) => {
        if (w.active && w.element) {
          w.tempLightningHandler = (e) => handleWormClick(e, w);
          w.element.addEventListener("click", w.tempLightningHandler);
        }
      });

      document.body.style.cursor = "crosshair";
    };
  };

  if (!window.WormPowerUpEffectsRegistry) {
    window.WormPowerUpEffectsRegistry = {};
  }

  window.WormPowerUpEffectsRegistry.chainLightning = function(system, payload) {
    system._executeChainLightning(payload.x, payload.y, payload.originalEvent);
  };
})();
