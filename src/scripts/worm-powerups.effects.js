// src/scripts/worm-powerups.effects.js
(function() {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for effect helpers");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;

  /**
   * CHAIN LIGHTNING: Click worm to kill nearby worms
   * @deprecated Use _executeChainLightning instead (two-click system)
   */
  proto.activateChainLightning = function() {
    console.log(`⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash!`);

    const killCount = this.chainLightningKillCount;
    console.log(`⚡ Will kill ${killCount} worms in proximity`);

    const handleWormClick = (e, worm) => {
      e.stopPropagation();
      console.log(`⚡ Chain Lightning targeting worm ${worm.id}!`);

      // Find closest worms
      // REFACTORED: Use shared calculateDistance utility from utils.js
      const sortedWorms = this.wormSystem.worms
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

      // Kill with delay for visual effect
      sortedWorms.forEach((targetWorm, index) => {
        setTimeout(() => {
          if (targetWorm.active) {
            // Lightning visual effect
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

      // Reset count back to 5
      this.chainLightningKillCount = 5;

      // Cleanup listeners
      this.wormSystem.worms.forEach((w) => {
        if (w.element && w.tempLightningHandler) {
          w.element.removeEventListener("click", w.tempLightningHandler);
          delete w.tempLightningHandler;
        }
      });

      document.body.style.cursor = "";
    };

    // Add temporary click listeners to all worms
    this.wormSystem.worms.forEach((w) => {
      if (w.active && w.element) {
        w.tempLightningHandler = (e) => handleWormClick(e, w);
        w.element.addEventListener("click", w.tempLightningHandler);
      }
    });

    document.body.style.cursor = "crosshair";
  };

  /**
   * Create lightning bolt visual effect between two points
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   */
  proto.createLightningBolt = function(x1, y1, x2, y2) {
    const lightning = document.createElement("div");
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Create jagged lightning path using SVG for better visuals
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    // Generate jagged lightning path with random deviations
    const segments = Math.max(3, Math.floor(length / 50)); // More segments for longer bolts
    let pathData = `M 0 0`;

    for (let i = 1; i < segments; i++) {
      const progress = i / segments;
      const targetX = length * progress;

      // Add random deviation perpendicular to line direction
      const deviation = (Math.random() - 0.5) * 30;

      pathData += ` L ${targetX} ${deviation}`;
    }
    pathData += ` L ${length} 0`; // End at target

    path.setAttribute("d", pathData);
    path.setAttribute("stroke", "#00ffff");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("fill", "none");
    path.setAttribute("filter", "url(#lightning-glow)");

    // Add glow filter
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter",
    );
    filter.setAttribute("id", "lightning-glow");

    const feGaussianBlur = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur",
    );
    feGaussianBlur.setAttribute("stdDeviation", "3");
    feGaussianBlur.setAttribute("result", "coloredBlur");

    const feMerge = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMerge",
    );
    const feMergeNode1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode",
    );
    feMergeNode1.setAttribute("in", "coloredBlur");
    const feMergeNode2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode",
    );
    feMergeNode2.setAttribute("in", "SourceGraphic");

    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);
    defs.appendChild(filter);

    svg.appendChild(defs);
    svg.appendChild(path);

    svg.style.cssText = `
            position: absolute;
            left: 0;
            top: -15px;
            width: ${length}px;
            height: 30px;
            overflow: visible;
            pointer-events: none;
        `;

    lightning.style.cssText = `
            position: fixed;
            left: ${x1}px;
            top: ${y1}px;
            transform-origin: 0 50%;
            transform: rotate(${angle}rad);
            z-index: 10002;
            pointer-events: none;
            animation: lightning-flash 0.3s ease-out;
        `;

    lightning.appendChild(svg);
    document.body.appendChild(lightning);

    // Create additional spark particles at impact point
    this.createLightningSparkles(x2, y2);

    setTimeout(() => {
      if (lightning.parentNode) {
        lightning.parentNode.removeChild(lightning);
      }
    }, 300);
  };

  /**
   * Create sparkle effect at lightning impact point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  proto.createLightningSparkles = function(x, y) {
    for (let i = 0; i < 8; i++) {
      const sparkle = document.createElement("div");
      const angle = (Math.PI * 2 * i) / 8;
      const distance = 20 + Math.random() * 20;

      sparkle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: #00ffff;
                border-radius: 50%;
                box-shadow: 0 0 8px #00ffff;
                animation: sparkle-burst 0.4s ease-out forwards;
                --angle-x: ${Math.cos(angle) * distance};
                --angle-y: ${Math.sin(angle) * distance};
                z-index: 10003;
                pointer-events: none;
            `;

      document.body.appendChild(sparkle);

      setTimeout(() => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      }, 400);
    }
  };

  /**
   * SPIDER: Spawns conversion spider that turns worms into more spiders
   */
  proto.activateSpider = function() {
    console.log(`🕷️ SPIDER ACTIVATED! Spawning conversion spider...`);

    const activeWorms = this.wormSystem.worms.filter((w) => w.active);
    if (activeWorms.length === 0) {
      console.log(`⚠️ No worms to convert!`);
      return;
    }

    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;

    this.spawnSpider(startX, startY);
  };

  /**
   * Spawn a spider entity that chases and converts worms
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  proto.spawnSpider = function(x, y) {
    const spider = document.createElement("div");
    spider.className = "spider-entity";
    spider.textContent = "🕷️";
    spider.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 40px;
            z-index: 10001;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

    const spiderData = {
      id: `spider-${Date.now()}`,
      element: spider,
      x: x,
      y: y,
      type: "spider",
      active: true,
      isHeart: false,
    };

    // Click to turn into heart → skull progression
    spider.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!spiderData.isHeart) {
        spider.textContent = "❤️";
        spiderData.isHeart = true;
        console.log(`🕷️ Spider clicked → ❤️`);

        // After 1 minute, turn to skull
        setTimeout(() => {
          spider.textContent = "💀";
          console.log(`❤️ → 💀`);

          // After 10 seconds, remove skull
          setTimeout(() => {
            if (spider.parentNode) {
              spider.parentNode.removeChild(spider);
            }
            spiderData.active = false;
          }, this.SKULL_DISPLAY_DURATION);
        }, this.SPIDER_HEART_DURATION);
      }
    });

    this.wormSystem.crossPanelContainer.appendChild(spider);

    // Spider AI: Chase nearest worm
    const moveSpider = () => {
      if (!spiderData.active || spiderData.isHeart) return;

      const activeWorms = this.wormSystem.worms.filter((w) => w.active);
      if (activeWorms.length === 0) {
        console.log(`🕷️ No more worms to convert`);
        return;
      }

      // Find closest worm
      // REFACTORED: Use shared calculateDistance utility from utils.js
      const closest = activeWorms.reduce((prev, curr) => {
        const prevDist = calculateDistance(
          prev.x,
          prev.y,
          spiderData.x,
          spiderData.y,
        );
        const currDist = calculateDistance(
          curr.x,
          curr.y,
          spiderData.x,
          spiderData.y,
        );
        return currDist < prevDist ? curr : prev;
      });

      const dist = calculateDistance(
        closest.x,
        closest.y,
        spiderData.x,
        spiderData.y,
      );

      if (dist < 30) {
        // Convert worm → spider (chain reaction!)
        console.log(
          `🕷️ Spider converted worm ${closest.id} to another spider!`,
        );
        this.wormSystem.removeWorm(closest);
        this.spawnSpider(closest.x, closest.y);

        // Remove this spider
        if (spider.parentNode) {
          spider.parentNode.removeChild(spider);
        }
        spiderData.active = false;
      } else {
        // Chase worm
        const speed = 5;
        const dx = closest.x - spiderData.x;
        const dy = closest.y - spiderData.y;
        spiderData.x += (dx / dist) * speed;
        spiderData.y += (dy / dist) * speed;
        spider.style.left = `${spiderData.x}px`;
        spider.style.top = `${spiderData.y}px`;

        requestAnimationFrame(moveSpider);
      }
    };

    moveSpider();
  };

  /**
   * DEVIL: Click to spawn devil magnet that attracts and kills worms
   */
  proto.activateDevil = function() {
    console.log(`👹 DEVIL ACTIVATED! Click location to spawn devil...`);

    const handleClick = (e) => {
      this.spawnDevil(e.clientX, e.clientY);
      document.removeEventListener("click", handleClick);
      document.body.style.cursor = "";
    };

    document.addEventListener("click", handleClick);
    document.body.style.cursor = "crosshair";
  };

  /**
   * Spawn devil entity that attracts worms and kills after proximity time
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
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
      wormProximity: new Map(), // Track time each worm has been near
    };

    const checkProximity = () => {
      const activeWorms = this.wormSystem.worms.filter((w) => w.active);

      // REFACTORED: Use shared calculateDistance utility from utils.js
      activeWorms.forEach((worm) => {
        const dist = calculateDistance(
          worm.x,
          worm.y,
          devilData.x,
          devilData.y,
        );

        if (dist < this.DEVIL_PROXIMITY_DISTANCE) {
          // Worm is near devil
          if (!devilData.wormProximity.has(worm.id)) {
            devilData.wormProximity.set(worm.id, Date.now());
            console.log(`👹 Worm ${worm.id} attracted to devil`);
          } else {
            // Check if worm has been near long enough
            const timeNear = Date.now() - devilData.wormProximity.get(worm.id);
            if (timeNear >= this.DEVIL_KILL_TIME) {
              console.log(
                `👹 Devil killed worm ${worm.id} after ${this.DEVIL_KILL_TIME /
                  1000}s proximity!`,
              );
              this.wormSystem.explodeWorm(worm, false, false);
              devilData.wormProximity.delete(worm.id);
            }
          }

          // Override worm behavior to rush toward devil
          worm.isRushingToDevil = true;
          worm.devilX = devilData.x;
          worm.devilY = devilData.y;
        } else {
          // Worm left proximity
          if (devilData.wormProximity.has(worm.id)) {
            console.log(`👹 Worm ${worm.id} escaped devil proximity`);
            devilData.wormProximity.delete(worm.id);
          }
          worm.isRushingToDevil = false;
        }
      });

      // Continue checking if there are active worms
      if (activeWorms.length > 0) {
        requestAnimationFrame(checkProximity);
      } else {
        // No more worms, remove devil
        if (devil.parentNode) {
          devil.parentNode.removeChild(devil);
        }
        console.log(`👹 Devil removed - no more worms`);
      }
    };

    checkProximity();
  };
})();
