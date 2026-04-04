(function () {
  window.WormPowerUpEffects = window.WormPowerUpEffects || {};

  const SPIDER_IDLE_POLL_INTERVAL_MS = 150;

  window.WormPowerUpEffects.applySpiderEffects = function (proto) {
    proto._executeSpider = function (x, y) {
      this.spawnSpider(x, y);
    };

    proto.activateSpider = function () {
      console.log("🕷️ SPIDER ACTIVATED! Spawning conversion spider...");

      const activeWorms = this.wormSystem.worms.filter((w) => w.active);
      if (activeWorms.length === 0) {
        console.log("⚠️ No worms to convert!");
        return;
      }

      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;

      this.spawnSpider(startX, startY);
    };

    proto.spawnSpider = function (x, y) {
      const spider = document.createElement("div");
      spider.className = "spider-entity";
      spider.textContent = "🕷️";
      spider.style.cssText = `
            position: fixed;
            font-size: 40px;
            z-index: 10001;
            cursor: pointer;
            transition: opacity 0.3s ease, transform 0.3s ease;
            will-change: translate, transform, opacity;
        `;
      spider.style.translate = `${x}px ${y}px`;

      const spiderData = {
        id: `spider-${Date.now()}`,
        element: spider,
        x: x,
        y: y,
        type: "spider",
        active: true,
        createdAt: Date.now(),
        duration: 10000,
        fading: false,
        isHeart: false,
      };

      const handleSpiderInteract = (e) => {
        if (e.type === "click" && e.detail !== 0) {
          return;
        }

        if (typeof e.button === "number" && e.button !== 0) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (!spiderData.isHeart) {
          spider.textContent = "❤️";
          spiderData.isHeart = true;
          console.log("🕷️ Spider clicked → ❤️");

          setTimeout(() => {
            spider.textContent = "💀";
            console.log("❤️ → 💀");

            setTimeout(() => {
              if (spider.parentNode) {
                spider.parentNode.removeChild(spider);
              }
              spiderData.active = false;
            }, this.SKULL_DISPLAY_DURATION);
          }, this.SPIDER_HEART_DURATION);
        }
      };

      spider.addEventListener("pointerdown", handleSpiderInteract);
      spider.addEventListener("click", handleSpiderInteract);

      this.wormSystem.crossPanelContainer.appendChild(spider);

      let isIdleWaitingForWorms = false;

      const scheduleNextMove = (delayMs = 0) => {
        if (!spiderData.active || spiderData.isHeart) return;

        if (delayMs > 0) {
          setTimeout(() => {
            if (!spiderData.active || spiderData.isHeart) return;
            moveSpider();
          }, delayMs);
          return;
        }

        requestAnimationFrame(moveSpider);
      };

      const moveSpider = () => {
        if (!spiderData.active || spiderData.isHeart) return;

        const now = Date.now();
        const timeAlive = now - spiderData.createdAt;
        if (timeAlive > spiderData.duration - 2000 && !spiderData.fading) {
          spider.style.animation = "power-up-fade 2s ease-out";
          spiderData.fading = true;
        }
        if (timeAlive > spiderData.duration) {
          if (spider.parentNode) {
            spider.parentNode.removeChild(spider);
          }
          spiderData.active = false;
          console.log("🕷️ Spider removed - 10s timeout reached");
          return;
        }

        const activeWorms = this.wormSystem.worms.filter((w) => w.active);
        if (activeWorms.length === 0) {
          if (!isIdleWaitingForWorms) {
            console.log("🕷️ No more worms to convert (idle wait)");
            isIdleWaitingForWorms = true;
          }
          scheduleNextMove(SPIDER_IDLE_POLL_INTERVAL_MS);
          return;
        }

        isIdleWaitingForWorms = false;

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
          console.log(
            `🕷️ Spider converted worm ${closest.id} to another spider!`,
          );
          this.wormSystem.removeWorm(closest);
          this.spawnSpider(closest.x, closest.y);

          if (spider.parentNode) {
            spider.parentNode.removeChild(spider);
          }
          spiderData.active = false;
        } else {
          const speed = 5;
          const dx = closest.x - spiderData.x;
          const dy = closest.y - spiderData.y;
          spiderData.x += (dx / dist) * speed;
          spiderData.y += (dy / dist) * speed;
          spider.style.translate = `${spiderData.x}px ${spiderData.y}px`;

          scheduleNextMove();
        }
      };

      moveSpider();
    };
  };

  if (!window.WormPowerUpEffectsRegistry) {
    window.WormPowerUpEffectsRegistry = {};
  }

  window.WormPowerUpEffectsRegistry.spider = function (system, payload) {
    system._executeSpider(payload.x, payload.y);
  };
})();
