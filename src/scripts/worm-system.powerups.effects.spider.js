// src/scripts/worm-system.powerups.effects.spider.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for spider effects");
    return;
  }

  const proto = window.WormSystem.prototype;

  // Spider: Spawns spider that converts worms to spiders, which convert more worms
  proto.activateSpider = function() {
    console.log("🕷️ SPIDER ACTIVATED! Spawning conversion spider...");

    // Find closest worm
    const activeWorms = this.worms.filter((w) => w.active);
    if (activeWorms.length === 0) {
      console.log("⚠️ No worms to convert!");
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
        console.log("🕷️ Spider clicked - turned into ❤️!");

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
        console.log("🕷️ No more worms to convert");
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
})();
