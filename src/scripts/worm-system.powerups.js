// src/scripts/worm-system.powerups.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for power-up helpers");
    return;
  }

  const proto = window.WormSystem.prototype;
  const POWER_UP_TYPES = ["chainLightning", "spider", "devil"];
  const POWER_UP_EMOJIS = {
    chainLightning: "⚡",
    spider: "🕷️",
    devil: "👹",
  };
  const POWER_UP_DROP_STYLE = {
    position: "fixed",
    fontSize: "30px",
    zIndex: "10001",
    cursor: "pointer",
    animation: "power-up-appear 0.5s ease-out",
    pointerEvents: "auto",
  };

  // Drop power-up at worm location
  proto.dropPowerUp = function(x, y, type = null) {
    // Random power-up type if not specified
    if (!type) {
      type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
    }

    const powerUp = document.createElement("div");
    powerUp.className = "power-up";
    powerUp.dataset.type = type;

    // Set emoji based on type
    powerUp.textContent = POWER_UP_EMOJIS[type] || "⭐";

    powerUp.style.left = `${x}px`;
    powerUp.style.top = `${y}px`;
    Object.assign(powerUp.style, POWER_UP_DROP_STYLE);

    // Click to collect
    powerUp.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collectPowerUp(type, powerUp);
    });

    if (this.crossPanelContainer) {
      this.crossPanelContainer.appendChild(powerUp);
    }
    console.log(
      `✨ Power-up "${type}" dropped at (${x.toFixed(0)}, ${y.toFixed(0)})`,
    );

    // Auto-remove after 10 seconds if not collected
    setTimeout(() => {
      if (powerUp.parentNode) {
        powerUp.style.animation = "power-up-fade 0.5s ease-out";
        setTimeout(() => {
          if (powerUp.parentNode) {
            powerUp.parentNode.removeChild(powerUp);
          }
        }, this.WORM_REMOVAL_DELAY);
      }
    }, this.SLIME_SPLAT_DURATION);
  };

  // Collect power-up
  proto.collectPowerUp = function(type, element) {
    this.powerUps[type]++;
    console.log(`🎁 Collected ${type} power-up! Total: ${this.powerUps[type]}`);

    // Chain Lightning: Increase kill count with each pickup
    if (type === "chainLightning") {
      // Only increase after first pickup
      if (this.powerUps[type] > 1) {
        this.chainLightningKillCount += 2;
        console.log(
          `⚡ Chain Lightning kill count increased to ${this.chainLightningKillCount}`,
        );
      }
    }

    // Visual feedback
    element.style.animation = "power-up-collect 0.3s ease-out";

    // Update console display (will be implemented)
    this.updatePowerUpDisplay();

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);
  };

  // Update power-up display on console
  proto.updatePowerUpDisplay = function() {
    console.log(
      `📊 Power-ups: ⚡${this.powerUps.chainLightning} 🕷️${this.powerUps.spider} 👹${this.powerUps.devil}`,
    );

    // PERFORMANCE: Use cached elements
    let powerUpDisplay =
      this.cachedPowerUpDisplay || document.getElementById("power-up-display");
    const _consoleElement =
      this.consoleElement || document.getElementById("symbol-console"); // Reserved for console integration

    if (!powerUpDisplay) {
      powerUpDisplay = document.createElement("div");
      powerUpDisplay.id = "power-up-display";
      powerUpDisplay.className = "power-up-display";

      // Append to body for fixed positioning
      document.body.appendChild(powerUpDisplay);

      // Make draggable
      this._makePowerUpDisplayDraggable(powerUpDisplay);

      this.cachedPowerUpDisplay = powerUpDisplay; // Cache the newly created display
      this.cachedPowerUpItems = createPowerUpItems.call(this, powerUpDisplay);
    }
    updatePowerUpItems.call(this);
  };

  function createPowerUpItems(container) {
    const items = {};
    POWER_UP_TYPES.forEach((type) => {
      const item = document.createElement("div");
      item.className = "power-up-item";
      item.dataset.type = type;
      item.setAttribute("data-testid", `powerup-${type}`);
      item.addEventListener("mouseenter", () => {
        item.classList.add("is-hovered");
      });
      item.addEventListener("mouseleave", () => {
        item.classList.remove("is-hovered");
      });
      item.addEventListener("click", () => {
        this.usePowerUp(type);
      });

      const countSpan = document.createElement("span");
      countSpan.className = "power-up-count";
      item.appendChild(countSpan);

      if (type === "chainLightning") {
        const badge = document.createElement("div");
        badge.className = "power-up-count-badge";
        badge.hidden = true;
        item.appendChild(badge);
        items.chainLightningBadge = badge;
      }

      items[type] = { item, countSpan };
      container.appendChild(item);
    });

    return items;
  }

  function updatePowerUpItems() {
    const items = this.cachedPowerUpItems;
    if (!items) return;

    POWER_UP_TYPES.forEach((type) => {
      const entry = items[type];
      if (!entry) return;
      entry.countSpan.textContent = `${POWER_UP_EMOJIS[type] || "⭐"} ${this
        .powerUps[type] ?? 0}`;
    });

    if (items.chainLightningBadge) {
      if (this.powerUps.chainLightning > 0) {
        items.chainLightningBadge.hidden = false;
        items.chainLightningBadge.textContent = `${this.chainLightningKillCount}`;
      } else {
        items.chainLightningBadge.hidden = true;
        items.chainLightningBadge.textContent = "";
      }
    }
  }

  // Make power-up display draggable
  proto._makePowerUpDisplayDraggable = function(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    element.addEventListener("pointerdown", dragStart);
    document.addEventListener("pointermove", drag);
    document.addEventListener("pointerup", dragEnd);

    function dragStart(e) {
      // Only allow dragging from the display itself, not from power-up items
      if (e.target.classList.contains("power-up-item")) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === element || e.target.parentElement === element) {
        isDragging = true;
        element.style.cursor = "grabbing";
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        // Keep within viewport bounds
        const rect = element.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        const boundedX = Math.max(0, Math.min(currentX, maxX));
        const boundedY = Math.max(0, Math.min(currentY, maxY));

        setTranslate(boundedX, boundedY, element);
      }
    }

    function dragEnd(e) {
      if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        element.style.cursor = "move";
      }
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
  };

  // Use a power-up
  proto.usePowerUp = function(type) {
    if (this.powerUps[type] <= 0) {
      console.log(`⚠️ No ${type} power-ups available!`);
      return;
    }

    console.log(`🎮 Using ${type} power-up!`);
    this.powerUps[type]--;

    if (type === "chainLightning") {
      this.activateChainLightning();
    } else if (type === "spider") {
      this.activateSpider();
    } else if (type === "devil") {
      this.activateDevil();
    }

    this.updatePowerUpDisplay();
  };
})();
