// src/scripts/worm-system.powerups.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for power-up helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  // Drop power-up at worm location
  proto.dropPowerUp = function(x, y, type = null) {
    // Random power-up type if not specified
    if (!type) {
      const types = ["chainLightning", "spider", "devil"];
      type = types[Math.floor(Math.random() * types.length)];
    }

    const powerUp = document.createElement("div");
    powerUp.className = "power-up";
    powerUp.dataset.type = type;

    // Set emoji based on type
    const emojis = {
      chainLightning: "⚡",
      spider: "🕷️",
      devil: "👹",
    };
    powerUp.textContent = emojis[type] || "⭐";

    powerUp.style.left = `${x}px`;
    powerUp.style.top = `${y}px`;
    powerUp.style.position = "fixed";
    powerUp.style.fontSize = "30px";
    powerUp.style.zIndex = "10001";
    powerUp.style.cursor = "pointer";
    powerUp.style.animation = "power-up-appear 0.5s ease-out";
    powerUp.style.pointerEvents = "auto";

    // Click to collect
    powerUp.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collectPowerUp(type, powerUp);
    });

    this.crossPanelContainer.appendChild(powerUp);
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
      powerUpDisplay.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px;
                border-radius: 8px;
                font-family: 'Orbitron', monospace;
                font-size: 16px;
                z-index: 9999;
                display: flex;
                justify-content: center;
                gap: 12px;
                border: 2px solid #0f0;
                box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                cursor: move;
                user-select: none;
            `;

      // Append to body for fixed positioning
      document.body.appendChild(powerUpDisplay);

      // Make draggable
      this._makePowerUpDisplayDraggable(powerUpDisplay);

      this.cachedPowerUpDisplay = powerUpDisplay; // Cache the newly created display
    }

    powerUpDisplay.innerHTML = `
            <div class="power-up-item" data-type="chainLightning" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s; position: relative;">
                ⚡ ${this.powerUps.chainLightning}
                ${
                  this.powerUps.chainLightning > 0
                    ? `<div style="position: absolute; top: -10px; right: -10px; font-size: 12px; color: #0ff;">${this.chainLightningKillCount}</div>`
                    : ""
                }
            </div>
            <div class="power-up-item" data-type="spider" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                🕷️ ${this.powerUps.spider}
            </div>
            <div class="power-up-item" data-type="devil" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                👹 ${this.powerUps.devil}
            </div>
        `;

    // Add click handlers
    powerUpDisplay.querySelectorAll(".power-up-item").forEach((item) => {
      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(0, 255, 0, 0.3)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "transparent";
      });
      item.addEventListener("click", () => {
        const type = item.dataset.type;
        this.usePowerUp(type);
      });
    });
  };

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
