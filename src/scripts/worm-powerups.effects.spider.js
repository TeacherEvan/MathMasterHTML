(function() {
  window.WormPowerUpEffects = window.WormPowerUpEffects || {};

  window.WormPowerUpEffects.applySpiderEffects = function(proto) {
    proto.activateSpider = function() {
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

      spider.addEventListener("click", (e) => {
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
      });

      this.wormSystem.crossPanelContainer.appendChild(spider);

      const moveSpider = () => {
        if (!spiderData.active || spiderData.isHeart) return;

        const activeWorms = this.wormSystem.worms.filter((w) => w.active);
        if (activeWorms.length === 0) {
          console.log("🕷️ No more worms to convert");
          return;
        }

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
          spider.style.left = `${spiderData.x}px`;
          spider.style.top = `${spiderData.y}px`;

          requestAnimationFrame(moveSpider);
        }
      };

      moveSpider();
    };
  };
})();
