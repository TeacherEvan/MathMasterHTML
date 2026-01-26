// src/scripts/worm-system.powerups.effects.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for power-up effects");
    return;
  }

  const proto = window.WormSystem.prototype;

  // Chain Lightning: Click worm to kill 5 + nearby worms
  proto.activateChainLightning = function() {
    console.log(
      `⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash the power!`,
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

  // Spider: Spawns spider that converts worms to spiders, which convert more worms
  proto.activateSpider = function() {
    console.log(`🕷️ SPIDER ACTIVATED! Spawning conversion spider...`);

    // Find closest worm
    const activeWorms = this.worms.filter((w) => w.active);
    if (activeWorms.length === 0) {
      console.log(`⚠️ No worms to convert!`);
      return;
    }

    // Spawn spider at random location
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;

    this.spawnSpider(startX, startY);
  };

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
      createdAt: Date.now(),
      isHeart: false,
    };

    // Click to turn into heart
    spider.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!spiderData.isHeart) {
        spider.textContent = "❤️";
        spiderData.isHeart = true;
        console.log(`🕷️ Spider clicked - turned into ❤️!`);

        // After 1 minute, turn to skull
        setTimeout(() => {
          if (spider.parentNode) {
            spider.textContent = "💀";
            setTimeout(() => {
              if (spider.parentNode) {
                spider.parentNode.removeChild(spider);
              }
            }, this.SKULL_DISPLAY_DURATION); // Remove after 10 seconds
          }
        }, this.SPIDER_HEART_DURATION);
      }
    });

    this.crossPanelContainer.appendChild(spider);

    // Move spider toward closest worm
    const moveSpider = () => {
      if (!spiderData.active || spiderData.isHeart) return;

      const activeWorms = this.worms.filter((w) => w.active);
      if (activeWorms.length === 0) {
        console.log(`🕷️ No more worms to convert`);
        return;
      }

      // Find closest worm
      const closest = activeWorms.reduce((prev, curr) => {
        const prevDist = Math.sqrt(
          Math.pow(prev.x - spiderData.x, 2) +
            Math.pow(prev.y - spiderData.y, 2),
        );
        const currDist = Math.sqrt(
          Math.pow(curr.x - spiderData.x, 2) +
            Math.pow(curr.y - spiderData.y, 2),
        );
        return currDist < prevDist ? curr : prev;
      });

      // Move toward closest worm
      const dist = calculateDistance(
        spiderData.x,
        spiderData.y,
        closest.x,
        closest.y,
      );
      const dx = closest.x - spiderData.x;
      const dy = closest.y - spiderData.y;

      if (dist < 30) {
        // Convert worm to spider!
        console.log(
          `🕷️ Spider converted worm ${closest.id} to another spider!`,
        );
        this.removeWorm(closest);
        this.spawnSpider(closest.x, closest.y);

        // Remove this spider
        if (spider.parentNode) {
          spider.parentNode.removeChild(spider);
        }
        spiderData.active = false;
      } else {
        // Move toward worm
        const speed = 5;
        spiderData.x += (dx / dist) * speed;
        spiderData.y += (dy / dist) * speed;
        spider.style.left = `${spiderData.x}px`;
        spider.style.top = `${spiderData.y}px`;

        requestAnimationFrame(moveSpider);
      }
    };

    moveSpider();
  };

  // Devil: Click location to spawn devil, worms rush to it and die after 5s proximity
  proto.activateDevil = function() {
    console.log(`👹 DEVIL ACTIVATED! Click location to spawn devil...`);

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
