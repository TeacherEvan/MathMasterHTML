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

    console.log(`🪲 Purple worm ${worm.id} clicked - CREATING CLONE!`);

    // Visual feedback
    worm.element.style.animation = "worm-flash-purple 0.5s ease-out";
    setTimeout(() => {
      worm.element.style.animation = "";
    }, 500);

    // Purple worms should not die on direct click; click is a clone penalty.
    this.clonePurpleWorm(worm);
  };

  // PURPLE WORM: Clone purple worm (maintains purple properties)
  /**
   * Clone a purple worm - creates another purple worm as punishment for clicking
   * This is the ONLY cloning mechanic remaining (cloning curse removed Oct 2025)
   * Purple worms can only be killed by clicking matching symbol in Panel C rain.
   */
  proto.clonePurpleWorm = function(parentWorm) {
    // We removed the active check here because the parent worm might have just been "exploded" (deactivated)
    
    console.log(
      `🪲 Purple worm ${parentWorm.id} cloning! Creating purple clone...`,
    );

    // Check if we can spawn more worms
    if (this.worms.length >= this.maxWorms) {
      console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot clone.`);
      return;
    }

    // Create purple clone near parent
    const newWormId = `purple-clone-${Date.now()}-${Math.random()}`;

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

    const newWormElement = this.factory.createWormElement({
      id: newWormId,
      classNames: ["purple-worm"],
      segmentCount: this.WORM_SEGMENT_COUNT,
      x: newX,
      y: newY,
    });

    this.crossPanelContainer.appendChild(newWormElement); // Use cross-panel container

    // Create purple clone data through factory to keep properties consistent
    const cloneData = this.factory.createWormData({
      id: newWormId,
      element: newWormElement,
      x: newX,
      y: newY,
      baseSpeed: this.SPEED_PURPLE_WORM,
      roamDuration: this.PURPLE_CLONE_ROAM_TIME,
      isPurple: true,
      fromConsole: false,
      targetSymbol: parentWorm.targetSymbol,
    });
    cloneData.isRushingToTarget = parentWorm.isRushingToTarget;

    this.worms.push(cloneData);

    // Purple worm click handler – use pointerdown for immediate response on
    // a moving element (same reasoning as _spawnWormWithConfig).
    newWormElement.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handlePurpleWormClick(cloneData);
    });

    // Clone birth effect
    newWormElement.classList.add("worm-multiply");

    setTimeout(() => {
      newWormElement.classList.remove("worm-multiply");
    }, this.CLONE_BIRTH_ANIMATION);

    console.log(
      `🪲 Purple worm cloned! New clone ${newWormId}. Total worms: ${this.worms.length}`,
    );

    // Start animation loop if not already running
    if (!this.animationFrameId) {
      this.animate();
    }
  };
})();
