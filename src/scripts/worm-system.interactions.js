// src/scripts/worm-system.interactions.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for interaction helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  proto.handleWormInteraction = function(worm, event) {
    if (!worm || !worm.active) return;

    if (worm.isPurple) {
      this.handlePurpleWormClick(worm);
      return;
    }

    const now = Date.now();
    if (
      !worm.lastHitTime ||
      now - worm.lastHitTime > this.WORM_CLICK_GRACE_WINDOW
    ) {
      worm.lastHitTime = now;
      this._triggerWormEscape(worm, event);
      return;
    }

    worm.lastHitTime = 0;
    this.handleWormClick(worm);
  };

  proto._triggerWormEscape = function(worm, event) {
    const now = Date.now();
    worm.escapeUntil = now + this.CURSOR_ESCAPE_DURATION;

    const cursor = this.cursorState;
    let dx = Math.random() - 0.5;
    let dy = Math.random() - 0.5;

    if (cursor && cursor.isActive) {
      dx = worm.x - cursor.x;
      dy = worm.y - cursor.y;
    } else if (event && typeof event.clientX === "number") {
      dx = worm.x - event.clientX;
      dy = worm.y - event.clientY;
    }

    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    worm.escapeVector = {
      x: dx / distance,
      y: dy / distance,
    };

    console.log(`🐛 Worm ${worm.id} escaped click - first strike used`);
  };

  proto.handleWormClick = function(worm) {
    if (!worm.active) return;

    // GREEN WORMS: Always explode on click (no cloning)
    console.log(`💥 Green worm ${worm.id} clicked - EXPLODING!`);

    // Drop power-up if this worm has one
    if (worm.hasPowerUp) {
      this.dropPowerUp(worm.x, worm.y, worm.powerUpType);
    }

    this.explodeWorm(worm, false); // false = not a rain kill
  };

  // PURPLE WORM: Special click handler - always clones
  proto.handlePurpleWormClick = function(worm) {
    if (!worm.active) return;

    console.log(`🟣 Purple worm ${worm.id} clicked - CREATING CLONE!`);

    // Visual feedback
    worm.element.style.animation = "worm-flash-purple 0.5s ease-out";
    setTimeout(() => {
      worm.element.style.animation = "";
    }, 500);

    // Clone the purple worm
    this.clonePurpleWorm(worm);
  };

  // PURPLE WORM: Clone purple worm (maintains purple properties)
  /**
   * Clone a purple worm - creates another purple worm as punishment for clicking
   * This is the ONLY cloning mechanic remaining (cloning curse removed Oct 2025)
   * Purple worms can only be killed by clicking matching symbol in Panel C rain.
   */
  proto.clonePurpleWorm = function(parentWorm) {
    if (!parentWorm.active) return;

    console.log(
      `🟣 Purple worm ${parentWorm.id} cloning! Creating purple clone...`,
    );

    // Check if we can spawn more worms
    if (this.worms.length >= this.maxWorms) {
      console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot clone.`);
      parentWorm.element.style.animation = "worm-flash 0.3s ease-out";
      setTimeout(() => {
        parentWorm.element.style.animation = "";
      }, 300);
      return;
    }

    // Create purple clone near parent
    const newWormId = `purple-clone-${Date.now()}-${Math.random()}`;
    const newWormElement = document.createElement("div");
    newWormElement.className = "worm-container purple-worm";
    newWormElement.id = newWormId;

    // Worm body with segments
    const wormBody = document.createElement("div");
    wormBody.className = "worm-body";

    for (let i = 0; i < 5; i++) {
      const segment = document.createElement("div");
      segment.className = "worm-segment";
      segment.style.setProperty("--segment-index", String(i));
      wormBody.appendChild(segment);
    }

    newWormElement.appendChild(wormBody);

    // Position clone near parent with random offset - USE VIEWPORT COORDINATES
    const offset = this.CLONE_POSITION_OFFSET;
    const newX = Math.max(
      0,
      Math.min(
        window.innerWidth - 50,
        parentWorm.x + (Math.random() - 0.5) * offset * 2,
      ),
    );
    const newY = Math.max(
      0,
      Math.min(
        window.innerHeight - 50,
        parentWorm.y + (Math.random() - 0.5) * offset * 2,
      ),
    );

    newWormElement.style.left = `${newX}px`;
    newWormElement.style.top = `${newY}px`;
    newWormElement.style.position = "fixed"; // Use fixed for viewport positioning
    newWormElement.style.zIndex = "10000";
    newWormElement.style.opacity = "1";
    newWormElement.style.visibility = "visible";
    newWormElement.style.pointerEvents = "auto"; // Allow clicks

    this.crossPanelContainer.appendChild(newWormElement); // Use cross-panel container

    // Create purple clone data
    const cloneData = {
      id: newWormId,
      element: newWormElement,
      stolenSymbol: null,
      targetElement: null,
      targetSymbol: parentWorm.targetSymbol,
      x: newX,
      y: newY,
      velocityX: (Math.random() - 0.5) * 2.0,
      velocityY: (Math.random() - 0.5) * 1.0,
      active: true,
      hasStolen: false,
      isRushingToTarget: parentWorm.isRushingToTarget,
      roamingEndTime: Date.now() + this.PURPLE_CLONE_ROAM_TIME,
      isFlickering: false,
      baseSpeed: 2.0,
      currentSpeed: 2.0,
      isPurple: true, // Maintain purple status
      canStealBlue: true, // Can steal blue symbols
      fromConsole: false,
      crawlPhase: Math.random() * Math.PI * 2,
      direction: Math.random() * Math.PI * 2,
      aggressionLevel: 0,
      path: null,
      pathIndex: 0,
      lastPathUpdate: 0,
      lastHitTime: 0,
      escapeUntil: 0,
      escapeVector: null,
    };

    this.worms.push(cloneData);

    // Purple worm click handler – use pointerdown for immediate response on
    // a moving element (same reasoning as _spawnWormWithConfig).
    newWormElement.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handlePurpleWormClick(cloneData);
    });

    // Clone birth effect
    parentWorm.element.classList.add("worm-multiply");
    newWormElement.classList.add("worm-multiply");

    setTimeout(() => {
      parentWorm.element.classList.remove("worm-multiply");
      newWormElement.classList.remove("worm-multiply");
    }, this.CLONE_BIRTH_ANIMATION);

    console.log(
      `🟣 Purple worm cloned! New clone ${newWormId}. Total worms: ${this.worms.length}`,
    );

    // Start animation loop if not already running
    if (!this.animationFrameId) {
      this.animate();
    }
  };
})();
